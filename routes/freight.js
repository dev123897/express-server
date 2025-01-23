const resourceRoute = require('../tools/resourceRoute.js')
const {isNotNull} = require('../tools/utils.js')

module.exports = resourceRoute({
  resource: 'freight_resource',
  table: 'freight',
  joins: [
    'LEFT JOIN freight_companies AS c ON c.id = freightCompanyId'
  ],
  preprocessors: [
    (req, res, next) => {
      // TODO - tacky fix, refactor. shouldn't have to do aliasing in the routes.
      // resource.js should handle db aliasing. this can be done when building the parameters list.
      if (req.method === 'GET' && req.query.sort === 'id') req.query.sort = 'freight.id'

      next()
    }
  ],
  disableAdd: true,
  disableDelete: true,
  search: ['freight.id', 'c.name'],
  columns: [
    {
      name: 'freight.id',
      primaryKey: true
    },
    {
      name: 'received',
      disableEdit: true
    },
    {
      name: 'sent',
      validation: v => isNotNull(v)
    },
    {
      name: 'freightCompanyId',
      validation: v => isNotNull(v)
    },
    {
      name: 'c.name',
      displayName: 'freightCompany',
      disableEdit: true
    },
    {
      name: 'warehouseCode',
      disableEdit: true
    }
  ],
  where: {
    put: req => ({ query: 'freight.id = ?', params: [req.body.id] })
  }
})
