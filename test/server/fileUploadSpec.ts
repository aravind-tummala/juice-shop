/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import chai from 'chai'
import { challenges } from '../../data/datacache'
import { type Challenge } from 'data/types'
import { checkUploadSize, checkFileType, handleYamlUpload } from '../../routes/fileUpload'

const expect = chai.expect

describe('fileUpload', () => {
  let req: any
  let res: any
  let save: any

  beforeEach(() => {
    req = { file: { originalname: '' } }
    res = {}
    save = () => ({
      then () { }
    })
  })

  describe('should not solve "uploadSizeChallenge" when file size is', () => {
    const sizes = [0, 1, 100, 1000, 10000, 99999, 100000]
    sizes.forEach(size => {
      it(`${size} bytes`, () => {
        challenges.uploadSizeChallenge = { solved: false, save } as unknown as Challenge
        req.file.size = size

        checkUploadSize(req, res, () => {})

        expect(challenges.uploadSizeChallenge.solved).to.equal(false)
      })
    })
  })

  it('should solve "uploadSizeChallenge" when file size exceeds 100000 bytes', () => {
    challenges.uploadSizeChallenge = { solved: false, save } as unknown as Challenge
    req.file.size = 100001

    checkUploadSize(req, res, () => {})

    expect(challenges.uploadSizeChallenge.solved).to.equal(true)
  })

  it('should solve "uploadTypeChallenge" when file type is not PDF', () => {
    challenges.uploadTypeChallenge = { solved: false, save } as unknown as Challenge
    req.file.originalname = 'hack.exe'

    checkFileType(req, res, () => {})

    expect(challenges.uploadTypeChallenge.solved).to.equal(true)
  })

  it('should not execute JavaScript-specific YAML tags during YAML upload handling', () => {
    const originalDeprecatedInterfaceChallenge = challenges.deprecatedInterfaceChallenge
    const originalYamlBombChallenge = challenges.yamlBombChallenge
    const statusCodes: number[] = []
    delete process.env.JUICE_SHOP_YAML_TOJSON_EXECUTED

    challenges.deprecatedInterfaceChallenge = { solved: false, save } as unknown as Challenge
    challenges.yamlBombChallenge = { solved: false, save } as unknown as Challenge
    req.file.originalname = 'complaint.yml'
    req.file.buffer = Buffer.from(`toJSON: !!js/function >
  function () { process.env.JUICE_SHOP_YAML_TOJSON_EXECUTED = 'true'; return 'executed' }`)
    res.status = (code: number) => {
      statusCodes.push(code)
      return res
    }
    res.end = () => {}

    handleYamlUpload(req, res, () => {})

    challenges.deprecatedInterfaceChallenge = originalDeprecatedInterfaceChallenge
    challenges.yamlBombChallenge = originalYamlBombChallenge
    expect(statusCodes).to.include(410)
    expect(process.env.JUICE_SHOP_YAML_TOJSON_EXECUTED).to.equal(undefined)
  })

  it('should not solve "uploadTypeChallenge" when file type is PDF', () => {
    challenges.uploadTypeChallenge = { solved: false, save } as unknown as Challenge
    req.file.originalname = 'hack.pdf'

    checkFileType(req, res, () => {})

    expect(challenges.uploadTypeChallenge.solved).to.equal(false)
  })
})
