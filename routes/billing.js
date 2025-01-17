const wrap = require('../tools/wrap')
const db = require('../tools/db')
const fs = require('fs')
const path = require('path')
const resourceRoute = require('../tools/resourceRoute.js')

const router = resourceRoute({
  resource: 'billing_resource',
  table: 'billingRecords',
  disableAdd: true,
  disableEdit: true,
  disableDelete: true,
  search: ['billDate', 'paymentDate', 'billDueDate'],
  columns: [
    {
      name: 'id',
      primaryKey: true
    },
    {
      name: 'total',
    },
    {
      name: 'amountReceived',
    },
    {
      name: 'billDate',
    },
    {
      name: 'paymentDate',
    },
    {
      name: 'billDueDate',
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
      rel: 'self',
      href: '/billing/download/1',
      action: 'GET',
      types: ['application/pdf']
    }
  ]
})

router.get('/billing/download/:id', wrap(async (req, res, next) => { // eslint-disable-line
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

  const file = (await db.query('SELECT file FROM billingRecords ' + where, params))[0].file

  // CORS authorization for axios. Without this, the download still works but Content-Disposition will not be set in AxiosHeaders for the response object
  res.set('Access-Control-Expose-Headers', 'Content-Disposition')

  res.set('Content-Length', fs.statSync(file).size)
  res.set('Content-Type', 'application/pdf')
  res.set('Content-Disposition', 'attachment; filename=' + path.basename(file))

  const stream = fs.createReadStream(file)

  stream.on('error', e => {
    console.error(e)
    res.status(500).json({ error: 'failed to download file' })
  })
  stream.pipe(res)
}))

module.exports = router
