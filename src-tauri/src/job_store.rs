use std::collections::HashMap;

use crate::ipc_types::{Job, JobMessage};

pub struct JobStore {
    job_id_sequence: i32,
    jobs: HashMap<i32, Job>,
}
impl JobStore {
    pub fn new() -> Self {
        JobStore {
            job_id_sequence: 1,
            jobs: HashMap::new(),
        }
    }
    pub fn get(&self, job_id: i32) -> Option<Job> {
        self.jobs.get(&job_id).cloned()
    }
    pub fn create(&mut self) -> i32 {
        let job_id = self.job_id_sequence;
        self.job_id_sequence += 1;
        let job = Job {
            id: job_id,
            completed: false,
            canceled: false,
            messages: vec![],
        };
        self.jobs.insert(job_id, job);
        job_id
    }
    pub fn cancel(&mut self, job_id: i32) {
        self.jobs.get_mut(&job_id).map(|j| {
            j.canceled = true;
        });
    }
    pub fn set_completed(&mut self, job_id: i32) {
        self.jobs.get_mut(&job_id).map(|j| {
            j.completed = true;
        });
    }
    pub fn add_message(&mut self, job_id: i32, message: JobMessage) {
        self.jobs.get_mut(&job_id).map(|j| {
            j.messages.push(message);
        });
    }
    pub fn is_cancelled(&self, job_id: i32) -> bool {
        match self.jobs.get(&job_id) {
            None => true,
            Some(j) => j.canceled,
        }
    }
}
