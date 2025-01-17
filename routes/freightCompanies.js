const {isNotNull} = require('../tools/utils.js')
const resourceRoute = require('../tools/resourceRoute.js')

module.exports = resourceRoute({
  resource: 'freight_companies_resource',
  table: 'freight_companies',
  search: ['name'],
  columns: [
    {
      name: 'id',
      primaryKey: true
    },
    {
      name: 'name',
      validate: v => isNotNull(v) && v.length < 256
    }
  ],
  where: {
    put: req => ({ query: 'id = ?', params: [req.body.id] }),
    delete: req => ({ query: 'id = ?', params: [req.query.id] }),
  }
})
