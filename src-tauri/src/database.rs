use rusqlite::{fallible_streaming_iterator::FallibleStreamingIterator, named_params, Connection};
use tauri::AppHandle;

use crate::{
    error::{DkaError, DkaResult},
    filesystem::get_db_path,
    ipc_types::{Filing, Importer, Mailbox, MailboxCursor, Report, TaxpayerProfile},
};

fn get_connection(app_handle: &AppHandle) -> DkaResult<Connection> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "journal_mode", &"WAL")?;
    Ok(conn)
}

pub fn migrate_database(app_handle: &AppHandle) -> DkaResult<()> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        SELECT name FROM sqlite_master WHERE type='table' AND name='dobkapman_migrations'
    ",
    )?;
    let rows = stmt.query([])?;
    if rows.count()? == 0 {
        conn.prepare(
            "
            CREATE TABLE dobkapman_migrations (
                id INTEGER NOT NULL,
                name TEXT NOT NULL
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            INSERT INTO dobkapman_migrations (id, name) VALUES (1, 'init')
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            CREATE TABLE mailboxes (
                id INTEGER PRIMARY KEY,
                email_address TEXT NOT NULL,
                email_password TEXT NOT NULL,
                imap_host TEXT NOT NULL,
                imap_port INTEGER NOT NULL,
                cursor TEXT NOT NULL
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            INSERT INTO mailboxes (
                id,
                email_address,
                email_password,
                imap_host,
                imap_port,
                cursor
            ) VALUES (
                1,
                '',
                '',
                'imap.gmail.com',
                993,
                'date,' || date()
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            CREATE TABLE taxpayer_profiles (
                id INTEGER PRIMARY KEY,
                jmbg TEXT NOT NULL,
                full_name TEXT NOT NULL,
                street_address TEXT NOT NULL,
                opstina_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                email_address TEXT NOT NULL
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            INSERT INTO taxpayer_profiles (
                id,
                jmbg,
                full_name,
                street_address,
                opstina_code,
                phone_number,
                email_address
            ) VALUES (
                1,
                '',
                '',
                '',
                '',
                '',
                ''
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            CREATE TABLE importers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                taxpayer_profile_id INTEGER NOT NULL REFERENCES taxpayer_profiles(id),
                mailbox_id INTEGER NOT NULL REFERENCES mailboxes(id),
                from_filter TEXT NOT NULL,
                subject_filter TEXT NOT NULL,
                payment_notes TEXT NOT NULL,
                attachment_regex TEXT NOT NULL
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            CREATE TABLE reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                importer_id INTEGER REFERENCES importers(id) ON DELETE SET NULL,
                mailbox_id INTEGER NOT NULL REFERENCES mailboxes(id),
                mailbox_message_id INTEGER NOT NULL,
                report_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'init'
            )
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            CREATE UNIQUE INDEX reports_importer_report_name_ui
            ON reports(importer_id, report_name)
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            CREATE TABLE filings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL REFERENCES reports(id),
                paying_entity TEXT NOT NULL,
                filing_deadline TEXT NOT NULL,
                tax_payable INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'init'
            )
        ",
        )?
        .execute([])?;
    }
    let mut migrations_stmt = conn.prepare(
        "
        SELECT id FROM dobkapman_migrations
    ",
    )?;
    let db_migration_version: i32 = migrations_stmt
        .query_map([], |row| Ok(row.get::<_, i32>(0)?))?
        .map(|r| r.unwrap())
        .max()
        .expect("At least one migration should already exist");
    if db_migration_version < 2 {
        conn.prepare(
            "
            ALTER TABLE filings ADD COLUMN \"type\" TEXT NOT NULL DEFAULT 'dividend'
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            INSERT INTO dobkapman_migrations (id, name) VALUES (2, 'filing-type')
        ",
        )?
        .execute([])?;
    }
    if db_migration_version < 3 {
        conn.prepare(
            "
            ALTER TABLE filings ADD COLUMN tax_payment_reference TEXT NOT NULL DEFAULT ''
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            INSERT INTO dobkapman_migrations (id, name) VALUES (3, 'tax-payment-reference')
        ",
        )?
        .execute([])?;
    }
    if db_migration_version < 4 {
        conn.prepare(
            "
            ALTER TABLE reports ADD COLUMN type TEXT NOT NULL DEFAULT \'IbkrCsv\'
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            ALTER TABLE importers RENAME COLUMN type TO report_type
        ",
        )?
        .execute([])?;
        conn.prepare(
            "
            INSERT INTO dobkapman_migrations (id, name) VALUES (4, 'report-type')
        ",
        )?
        .execute([])?;
    }
    // Logic for migration 5 and above goes here
    if db_migration_version > 4 {
        panic!("Cannot migrate backwards, db_migration_version={db_migration_version}");
    }
    Ok(())
}

// Mailboxes

pub fn get_mailbox(app_handle: &AppHandle) -> DkaResult<Mailbox> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        select
            id,
            email_address,
            email_password,
            imap_host,
            imap_port,
            cursor
        from mailboxes
        where id=1
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map([], |row| {
            Ok(Mailbox {
                id: row.get::<_, i32>(0)?,
                email_address: row.get::<_, String>(1)?,
                email_password: row.get::<_, String>(2)?,
                imap_host: row.get::<_, String>(3)?,
                imap_port: row.get::<_, i32>(4)?,
                cursor: MailboxCursor::from_db_string(&row.get::<_, String>(5)?).unwrap(),
            })
        })?
        .collect();
    if rows.is_empty() {
        return Err(DkaError::generic("Mailbox not found in database"));
    }
    Ok(rows.into_iter().next().unwrap().unwrap())
}

pub fn update_mailbox(app_handle: &AppHandle, mailbox: &Mailbox) -> DkaResult<()> {
    get_connection(app_handle)?
        .prepare(
            "
        update mailboxes set
            email_address = :email_address,
            email_password = :email_password,
            imap_host = :imap_host,
            imap_port = :imap_port,
            cursor = :cursor
        where id=:id
        ",
        )?
        .execute(named_params! {
            ":id": mailbox.id,
            ":email_address": mailbox.email_address,
            ":email_password": mailbox.email_password,
            ":imap_host": mailbox.imap_host,
            ":imap_port": mailbox.imap_port,
            ":cursor": mailbox.cursor.to_db_string(),
        })?;
    Ok(())
}

// Taxpayer profiles

pub fn get_taxpayer_profile(app_handle: &AppHandle) -> DkaResult<TaxpayerProfile> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        select
            id,
            jmbg,
            full_name,
            street_address,
            opstina_code,
            phone_number,
            email_address
        from taxpayer_profiles
        where id=1
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map([], |row| {
            Ok(TaxpayerProfile {
                id: row.get::<_, i32>(0)?,
                jmbg: row.get::<_, String>(1)?,
                full_name: row.get::<_, String>(2)?,
                street_address: row.get::<_, String>(3)?,
                opstina_code: row.get::<_, String>(4)?,
                phone_number: row.get::<_, String>(5)?,
                email_address: row.get::<_, String>(6)?,
            })
        })?
        .collect();
    if rows.is_empty() {
        return Err(DkaError::generic("Taxpayer profile not found in database"));
    }
    Ok(rows.into_iter().next().unwrap().unwrap())
}

pub fn update_taxpayer_profile(
    app_handle: &AppHandle,
    taxpayer_profile: &TaxpayerProfile,
) -> DkaResult<()> {
    get_connection(app_handle)?
        .prepare(
            "
            update taxpayer_profiles set
                jmbg = :jmbg,
                full_name = :full_name,
                street_address = :street_address,
                opstina_code = :opstina_code,
                phone_number = :phone_number,
                email_address = :email_address
            where id=:id
        ",
        )?
        .execute(named_params! {
            ":id": taxpayer_profile.id,
            ":jmbg": taxpayer_profile.jmbg,
            ":full_name": taxpayer_profile.full_name,
            ":street_address": taxpayer_profile.street_address,
            ":opstina_code": taxpayer_profile.opstina_code,
            ":phone_number": taxpayer_profile.phone_number,
            ":email_address": taxpayer_profile.email_address,
        })?;
    Ok(())
}

// Importers

pub fn get_importers(app_handle: &AppHandle) -> DkaResult<Vec<Importer>> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        select
            id,
            name,
            report_type,
            taxpayer_profile_id,
            mailbox_id,
            from_filter,
            subject_filter,
            payment_notes,
            attachment_regex
        from importers
        order by id
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map([], |row| {
            Ok(Importer {
                id: row.get::<_, i32>(0)?,
                name: row.get::<_, String>(1)?,
                report_type: row.get::<_, String>(2)?,
                taxpayer_profile_id: row.get::<_, i32>(3)?,
                mailbox_id: row.get::<_, i32>(4)?,
                from_filter: row.get::<_, String>(5)?,
                subject_filter: row.get::<_, String>(6)?,
                payment_notes: row.get::<_, String>(7)?,
                attachment_regex: row.get::<_, String>(8)?,
            })
        })?
        .map(|r| r.unwrap())
        .collect();
    Ok(rows)
}

pub fn update_importer(app_handle: &AppHandle, importer: &Importer) -> DkaResult<()> {
    get_connection(app_handle)?
        .prepare(
            "
            update importers set
                name = :name,
                report_type = :report_type,
                from_filter = :from_filter,
                subject_filter = :subject_filter,
                payment_notes = :payment_notes,
                attachment_regex = :attachment_regex
            where id=:id
        ",
        )?
        .execute(named_params! {
            ":id": importer.id,
            ":name": importer.name,
            ":report_type": importer.report_type,
            ":from_filter": importer.from_filter,
            ":subject_filter": importer.subject_filter,
            ":payment_notes": importer.payment_notes,
            ":attachment_regex": importer.attachment_regex,
        })?;
    Ok(())
}

pub fn create_importer(app_handle: &AppHandle, importer: &Importer) -> DkaResult<i32> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        insert into importers(
            name,
            report_type,
            taxpayer_profile_id,
            mailbox_id,
            from_filter,
            subject_filter,
            payment_notes,
            attachment_regex
        ) values (
            :name,
            :report_type,
            1,
            1,
            :from_filter,
            :subject_filter,
            :payment_notes,
            :attachment_regex
        ) returning id
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map(
            named_params! {
                ":name": importer.name,
                ":report_type": importer.report_type,
                ":from_filter": importer.from_filter,
                ":subject_filter": importer.subject_filter,
                ":payment_notes": importer.payment_notes,
                ":attachment_regex": importer.attachment_regex,
            },
            |row| Ok(row.get::<_, i32>(0)?),
        )?
        .map(|r| r.unwrap())
        .collect();
    if rows.is_empty() {
        return Err(DkaError::generic("Failed to create importer"));
    }
    return Ok(rows[0]);
}

pub fn delete_importer(app_handle: &AppHandle, importer_id: i32) -> DkaResult<()> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        delete from importers
        where id=:id
    ",
    )?;
    stmt.execute(named_params! {
        ":id": importer_id,
    })?;
    Ok(())
}

// Reports

pub fn get_reports_by_mailbox(app_handle: &AppHandle, mailbox_id: i32) -> DkaResult<Vec<Report>> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        select
            id,
            type,
            importer_id,
            mailbox_id,
            mailbox_message_id,
            report_name,
            status
        from reports
        where mailbox_id=:mailbox_id
        order by id
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map(
            named_params! {
                ":mailbox_id": mailbox_id,
            },
            |row| {
                Ok(Report {
                    id: row.get::<_, i32>(0)?,
                    _type: row.get::<_, String>(1)?,
                    importer_id: row.get::<_, Option<i32>>(2)?,
                    mailbox_id: row.get::<_, i32>(3)?,
                    mailbox_message_id: row.get::<_, i32>(4)?,
                    report_name: row.get::<_, String>(5)?,
                    status: row.get::<_, String>(6)?,
                })
            },
        )?
        .map(|r| r.unwrap())
        .collect();
    Ok(rows)
}

pub fn delete_report(app_handle: &AppHandle, report_id: i32) -> DkaResult<()> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        delete from reports
        where id=:id
    ",
    )?;
    stmt.execute(named_params! {
        ":id": report_id,
    })?;
    Ok(())
}

pub fn create_report(app_handle: &AppHandle, report: &Report) -> DkaResult<i32> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
    insert into reports (
        type,
        importer_id,
        mailbox_id,
        mailbox_message_id,
        report_name,
        status
    ) values (
        :type,
        :importer_id,
        :mailbox_id,
        :mailbox_message_id,
        :report_name,
        :status
    ) returning id
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map(
            named_params! {
                ":type": report._type,
                ":importer_id": report.importer_id,
                ":mailbox_id": report.mailbox_id,
                ":mailbox_message_id": report.mailbox_message_id,
                ":report_name": report.report_name,
                ":status": report.status,
            },
            |row| Ok(row.get::<_, i32>(0)?),
        )?
        .map(|r| r.unwrap())
        .collect();
    if rows.is_empty() {
        return Err(DkaError::generic("Failed to create report"));
    }
    return Ok(rows[0]);
}

pub fn update_report(app_handle: &AppHandle, report: &Report) -> DkaResult<()> {
    get_connection(app_handle)?
        .prepare(
            "
            update reports set
                status = :status
            where id=:id
        ",
        )?
        .execute(named_params! {
            ":id": report.id,
            ":status": report.status,
        })?;
    Ok(())
}

// Filings

pub fn get_filings(app_handle: &AppHandle) -> DkaResult<Vec<Filing>> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        select
            id,
            type,
            report_id,
            status,
            paying_entity,
            filing_deadline,
            tax_payable,
            tax_payment_reference
        from filings
        order by id desc
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map([], |row| {
            Ok(Filing {
                id: row.get::<_, i32>(0)?,
                _type: row.get::<_, String>(1)?,
                report_id: row.get::<_, i32>(2)?,
                status: row.get::<_, String>(3)?,
                paying_entity: row.get::<_, String>(4)?,
                filing_deadline: row.get::<_, String>(5)?,
                tax_payable: row.get::<_, i64>(6)?,
                tax_payment_reference: row.get::<_, String>(7)?,
            })
        })?
        .map(|r| r.unwrap())
        .collect();
    Ok(rows)
}

pub fn update_filing(app_handle: &AppHandle, filing: &Filing) -> DkaResult<()> {
    get_connection(app_handle)?
        .prepare(
            "
            update filings set
                status = :status,
                tax_payment_reference = :tax_payment_reference
            where id=:id
        ",
        )?
        .execute(named_params! {
            ":id": filing.id,
            ":status": filing.status,
            ":tax_payment_reference": filing.tax_payment_reference,
        })?;
    Ok(())
}

pub fn create_filing(app_handle: &AppHandle, filing: &Filing) -> DkaResult<i32> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        insert into filings(
            type,
            report_id,
            status,
            paying_entity,
            filing_deadline,
            tax_payable,
            tax_payment_reference
        ) values (
            :type,
            :report_id,
            :status,
            :paying_entity,
            :filing_deadline,
            :tax_payable,
            :tax_payment_reference
        ) returning id
    ",
    )?;
    let rows: Vec<_> = stmt
        .query_map(
            named_params! {
                ":type": filing._type,
                ":report_id": filing.report_id,
                ":status": filing.status,
                ":paying_entity": filing.paying_entity,
                ":filing_deadline": filing.filing_deadline,
                ":tax_payable": filing.tax_payable,
                ":tax_payment_reference": filing.tax_payment_reference,
            },
            |row| Ok(row.get::<_, i32>(0)?),
        )?
        .map(|r| r.unwrap())
        .collect();
    if rows.is_empty() {
        return Err(DkaError::generic("Failed to create filing"));
    }
    return Ok(rows[0]);
}

pub fn delete_filing(app_handle: &AppHandle, filing_id: i32) -> DkaResult<()> {
    let conn = get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "
        delete from filings
        where id=:id
    ",
    )?;
    stmt.execute(named_params! {
        ":id": filing_id,
    })?;
    Ok(())
}
