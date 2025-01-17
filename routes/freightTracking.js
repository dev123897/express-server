const resourceRoute = require('../tools/resourceRoute.js')
const {isNotNull} = require('../tools/utils.js')

module.exports = resourceRoute({
  resource: 'freight_tracking_resource',
  table: 'freightTracking',
  search: ['freightTracking.name', 'warehouseTrackingCode', 'freightId'],
  joins: [
    'LEFT JOIN freight_companies AS c ON c.id = freightTracking.freightCompanyId',
    'LEFT JOIN freight AS f on f.id = freightId'
  ],
  preprocessors: [
    (req, res, next) => {
      // TODO - tacky fix, refactor. shouldn't have to do aliasing in the routes.
      // resource.js should handle db aliasing. this can be done when building the parameters list.
      if (req.method !== 'GET') {
        const payload = req.method !== 'DELETE' ? 'body' : 'query'

        // TODO-need to implement company accounts
         req[payload].companyId = '1'

        for(const key in req[payload]) req[payload][`freightTracking.${key}`] = req[payload][key]
      }

      next()
    }
  ],
  columns: [
    {
      name: 'freightTracking.id',
      primaryKey: true
    },
    {
      name: 'freightTracking.name',
      validate: v => isNotNull(v) && v.length < 256
    },
    {
      name: 'warehouseTrackingCode',
      validate: v => isNotNull(v) // && isIP(v)
    },
    {
      name: 'freightId',
      validate: v => isNotNull(v)
    },
    {
      name: 'companyId',
      validate: v => isNotNull(v)
    },
    {
      name: 'freightTracking.freightCompanyId',
      validate: v => isNotNull(v)
    },
    {
      name: 'c.name',
      displayName: 'freightCompany',
      disableEdit: true
    }
  ],
  where: {
    put: req => ({ query: 'freightTracking.id = ?', params: [req.body.id] }),
    delete: req => ({ query: 'freightTracking.id = ?', params: [req.query.id] }),
  }
})
