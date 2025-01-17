const resourceRoute = require('../tools/resourceRoute.js')
const {isNotNull} = require('../tools/utils.js')

module.exports = resourceRoute({
  resource: 'warehouse_resource',
  table: 'warehouses',
  joins: [
    'LEFT JOIN freight AS c ON c.id = freightId'
  ],
  search: ['trackingCode', 'freightId'],
  preprocessors: [
    (req, res, next) => {
      // TODO - tacky fix, refactor. shouldn't have to do aliasing in the routes.
      // resource.js should handle db aliasing. this can be done when building the parameters list.
      if (req.method !== 'GET') {
        const payload = req.method !== 'DELETE' ? 'body' : 'query'
        req[payload]['warehouses.sent'] = req[payload].sent
      }

      next()
    }
  ],
  columns: [
    {
      name: 'warehouses.id',
      primaryKey: true
    },
    {
      name: 'trackingCode',
      validation: v => isNotNull(v) // && isIP(v)
    },
    {
      name: 'freightId'
    },
    {
      name: 'warehouses.sent'
    }
  ],
  where: {
    put: req => ({ query: 'id = ?', params: [req.body.id] }),
    delete: req => ({ query: 'id = ?', params: [req.query.id] }),
  }
})
