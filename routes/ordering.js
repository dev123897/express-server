/* eslint-disable no-unused-vars */
const wrap = require('../tools/wrap')
const axios = require('../tools/axios')
const resourceRoute = require('../tools/resourceRoute')

function forwardApiResponse(res, apiRes) {
  // CORS authorization for axios. Without this, the front end won't be able to read the location header
  res.set('Access-Control-Expose-Headers', 'location')

  res.location(apiRes.headers.location)
  res.status(apiRes.status).json(apiRes.data)
}

// POST and DELETE requests will be handled by the handlers below
const router = resourceRoute({
  resource: 'ordering_resource',
  table: 'orders',
  disableDelete: true,
  disableEdit: true,
  joins: [
    'LEFT JOIN freight_companies AS c ON c.id = freightCompanyId'
  ],
  search: ['freightId', 'freightCompanyId'],
  preprocessors: [
    wrap(async (req, res, next) => { // submit request, allow front end to begin polling
      if (req.method === 'GET') return next()

      if (!req.body?.freightId || !req.body?.freightCompanyId) return res.status(400).json({ message: 'missing parameter' })

      forwardApiResponse(res, await axios.post('/order', req.body))
      // no call to next() since, in this case, we do not want to send the request to the table
    })
  ],
  columns: [
    { name: 'freightId', primaryKey: true },
    { name: 'freightCompanyId' },
    {
      name: 'c.name',
      displayName: 'freightCompany',
      disableEdit: true
    }
  ],
  links: [
    {
      rel: 'self',
      href: '/order/poll/abcde',
      action: 'GET',
      types: []
    },
    {
      rel: 'self',
      href: '/order/cancel/abcde',
      action: 'DELETE',
      types: []
    },
    {
      rel: 'self',
      href: '/order/result/abcde',
      action: 'GET',
      types: []
    },
  ]
})

router.get('/order/poll/:id', wrap(async (req, res, next) => {
  forwardApiResponse(res, await axios.get(`/order/poll/${req.params.id}`))
}))

router.delete('/order/cancel/:id', wrap(async (req, res, next) => {
  forwardApiResponse(res, await axios.delete(`/order/cancel/${req.params.id}`))
}))

router.get('/order/result/:id', wrap(async (req, res, next) => {
  forwardApiResponse(res, await axios.get(`/order/result/${req.params.id}`))
}))

module.exports = router
