const wrap = require('../tools/wrap')
const db = require('../tools/db')
const fs = require('fs')
const {basename} = require('path')
const {spawnSync} = require('child_process')
const resourceRoute = require('../tools/resourceRoute.js')
const axios = require('axios').default
const {randomUUID} = require('crypto')

const handleError = e => { if(e) console.error(e) }

const router = resourceRoute({
  resource: 'files_resource',
  table: 'files',
  disableAdd: true,
  disableEdit: true,
  disableDelete: true,
  search: ['date'],
  columns: [
    {
      name: 'id',
      primaryKey: true
    },
    {
      name: 'date',
    },
    {
      name: 'companyId',
    },
    {
      name: 'file',
      transform: row => row.file = basename(row.file) // do not send file path
    }
  ],
  links: [
    {
      rel: 'files_resource',
      href: '/files/download/1',
      action: 'GET',
      types: ['application/octet-stream']
    }
  ]
})

router.get('/files/download/:id', wrap(async (req, res, next) => { // eslint-disable-line
  let where = 'WHERE id ', params

  try {
    // id can be either a number or an array of ids
    req.params.id = JSON.parse(req.params.id)

    if (req.params.id instanceof Array) {
      params = req.params.id
      where += `IN (${Array(params.length).fill('?').join(',')})`
    }
    else if(typeof req.params.id === 'number'){
      params = [req.params.id]
      where += '= ?'
    }
    else throw ''
  } catch (e) {
    console.error(e)
    return res.status(400).json({ message: 'operation failed: invalid parameter "id"'})
  }

  // TODO - add recurzive zip code as layer to labmda so we don't have to do it this way
  const filepaths = await db.query('SELECT file FROM files ' + where, params)
  const archive = `archive-${randomUUID()}`
  const archivedir = './tmp/' + archive

  // If dirs dont exist, create them
  await fs.promises.access(archivedir , fs.constants.F_OK)
    .catch(() => fs.promises.mkdir(archivedir , {recursive: true}))

  await Promise.all(
    filepaths.map(({ file }) =>
      axios({
        method: 'get',
        url: process.env.AWS_LAMBDA_S3_STREAM,
        params: { file },
        responseType: 'stream'
      })
        .then(({ data }) => fs.promises.writeFile(`${archivedir}/${file}`, data))
        .catch(console.error)
    )
  )

  let zipname = archive + '.zip'

  // cwd of /tmp so then zip wont compress the whole directory
  spawnSync('zip', ['-r', zipname, archive], {cwd: './tmp'})

  zipname = './tmp/' + zipname

  // CORS authorization for axios. Without this, the download still works but Content-Disposition will not be set in AxiosHeaders for the response object
  res.set('Access-Control-Expose-Headers', 'Content-Disposition')

  res.set('Content-Length', (await fs.promises.stat(zipname)).size)
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', 'attachment; filename=' + basename(zipname))

  const stream = fs.createReadStream(zipname)

  stream.on('error', e => {
    console.error(e)
    res.status(500).json({ error: 'failed to download file' })
  })

  stream.on('close', () => {
    fs.rm(zipname, handleError)
    fs.rm(archivedir , { recursive: true, force: true }, handleError)
  })

  stream.pipe(res)
}))

module.exports = router
