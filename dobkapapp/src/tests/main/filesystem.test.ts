import { getDefaultTechnicalConf } from '../../main/filesystem'
import fs from 'fs'

describe('filesystem', () => {
    it('getDefaultTechnicalConf', () => {
        // As a side effect, this test writes holiday data to the filesystem
        const holidayDataJson = JSON.stringify(getDefaultTechnicalConf().holidayConf, null, 4)
        fs.writeFileSync('holiday-data.json', holidayDataJson)
    })
})
