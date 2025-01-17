/* eslint-disable */
const wrap = require('../tools/wrap')
const db = require('../tools/db')
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const resourceRoute = require('../tools/resourceRoute.js')

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
      transform: row => row.file = path.basename(row.file) // do not send file path
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

  const file = (await db.query('SELECT file FROM files ' + where, params))[0].file
  const dir = path.dirname(file)

  const zipname = 'accountName.zip' // TODO - implement this, also handle case where we get multiple file ids from id is array
  // TODO - prob will need a subfolder for range of files
  // TODO NOTE - this route zips the entire temp/, it also creates a folder for every directory in the route

  childProcess.spawnSync('zip', ['-r', zipname, dir])

  // CORS authorization for axios. Without this, the download still works but Content-Disposition will not be set in AxiosHeaders for the response object
  res.set('Access-Control-Expose-Headers', 'Content-Disposition')

  res.set('Content-Length', fs.statSync(zipname).size)
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', 'attachment; filename=' + path.basename(zipname))

  const stream = fs.createReadStream(zipname)

  stream.on('error', e => {
    console.error(e)
    res.status(500).json({ error: 'failed to download file' })
  })
  stream.pipe(res)

  fs.rm(zipname, console.error)
}))


module.exports = router
