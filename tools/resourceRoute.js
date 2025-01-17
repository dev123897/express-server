const express = require('express')
const router = express.Router()
const db = require('../tools/db.js')
const wrap = require('../tools/wrap.js')

class ResourceError extends Error {
  constructor (code, resourceErrorMessage, ...params) {
    super(...params)

    // Maintains proper stack trace for where our error was thrown
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    if (Error.captureStackTrace) Error.captureStackTrace(this, ResourceError)

    this.code = code
    this.resourceErrorMessage = resourceErrorMessage
  }
}

function processQueryParameters(columns, params) {
  const queryParams = []

  for (const c of columns) {
    // Make sure all required parameters are present
    if (!Object.hasOwn(params, c.name)) throw new ResourceError(400, 'operation failed: missing parameter ' + c.name)

    // Validate user data
    if (c?.validate && !c.validate(params[c.name])) throw new ResourceError(400, 'operation failed: invalid parameter')

    queryParams.push(params[c.name])
  }

  return queryParams
}

function buildWhere(where, req, queryParams) {
  const method = req.method.toLowerCase()
  let query, params

  if (where && Object.hasOwn(where, method)) {
    query = ' WHERE '

    if (typeof where === 'string') query += where
    else { // callback
      const whereClause = where[method](req)

      // validate values exist
      if (!whereClause.params.every(param => param)) throw new ResourceError(400, 'operation failed: missing condition parameter')

      query += whereClause.query
      params = queryParams.concat(whereClause.params)
    }
  }

  return { query, params }
}

function buildSearch(search, searchKeys, params) {
  console.log(search, searchKeys)
  const last = searchKeys.length - 1
  const sql = ' LIKE ?'

  const query = searchKeys.reduce((accumulator, key, i) => {
    params.push(`%${search}%`)

    // Do not want column names to be escaped, so they can't be provided as parameters.
    // No risk of injection since they come from the server.
    return accumulator + (i < last ? key + sql + ' OR ' : key + sql)
  }, ' WHERE ')

  return { query, params }
}

const getColList = (columns, useDisplayName) => {
  return columns.reduce((accumulator, col, i) => {
    const name = col?.displayName && useDisplayName ? `${col.name} AS ${col.displayName}` : col.name
    return i === 0 ? `${name}` : `${accumulator}, ${name}`
  } , '')
}

function generateSql(table, req) {
  let queryParams = []

  let query = '', where = '', countQuery = '', filteredCols
  switch (req.method) {
    case 'GET':
      query = `SELECT ${getColList(table.columns, true)} FROM ${table.table}`

      const pk = table.columns.find(c => c.primaryKey)
      countQuery = `SELECT COUNT(${pk.name}) AS ${table?.total || 'total'} FROM ${table.table}`

      if (table?.joins) {
        const join = ` ${table.joins.join(' ')}`
        query += join
        countQuery += join
      }

      if (req.query?.search && table.search) {
        const search = buildSearch(req.query.search, table.search, queryParams)

        query += search.query
        countQuery += search.query
        queryParams = search.params
      }

      // make sure the sort column is a valid header before using in query
      if (req.query?.sort && table.columns.find(c => c.name === req.query.sort)) {
        const orderBy = ` ORDER BY ${req.query.sort} ${req.query.order === 'asc' ? 'ASC' : 'DESC' }`
        query += orderBy
        countQuery += orderBy
      }

      if (req.query.limit !== '0') { // 0, return all
        query += ' LIMIT ? OFFSET ?'
        queryParams.push(parseInt(req.query.limit) || 10, parseInt(req.query.offset) || 0)
      }

      break
    case 'POST':
      filteredCols = table.columns.filter(c => !c.primaryKey) // do not operate on primary key

      const questionMarks = Array(filteredCols.length).fill('?').join(',')
      query = `INSERT INTO ${table.table} (${getColList(filteredCols)}) VALUE (${questionMarks})`

      queryParams = processQueryParameters(filteredCols, req.body)
      break
    case 'PUT':
      filteredCols = table.columns.filter(c => !c.primaryKey && !c.disableEdit)

      const updateCols = filteredCols.reduce((accumulator, col, i) => i === 0
        ? `${col.name} = ?`
        : `${accumulator}, ${col.name} = ?`
      , '')
      query = `UPDATE ${table.table} SET ${updateCols}`

      queryParams = processQueryParameters(filteredCols, req.body)

      where = buildWhere(table.where, req, queryParams)
      break
    default: // DELETE
      query = `DELETE FROM ${table.table}`

      filteredCols = table.columns.filter(c => c.primaryKey)
      queryParams = processQueryParameters(filteredCols, req.query)

      where = buildWhere(table.where, req, queryParams)
  }

  if (where.query) {
    query += where.query

    if (where?.params) queryParams = where.params
  }

  return { query, queryParams, countQuery }
}

function processTransforms(payload, columns) {
  const filteredCols = columns.filter(col => col.transform)

  payload.forEach(row => {
    filteredCols.forEach(col => row[col.name] = col.transform(row))
  })
}

function buildHateoasLinks(table, curHttpMethod) {
  const rel = 'self', types = ['application/json']
  const links = []

  if (curHttpMethod !== 'GET')
     links.push({
      rel,
      href: table.resource + '?offset=1&search=key_name&sort=column_name&order=asc',
      action: 'GET',
      types
    })

  if (!table.disableAdd && curHttpMethod !== 'POST')
    links.push ({
      rel,
      href: table.resource,
      action: 'POST',
      types
    })

  if (!table.disableEdit && curHttpMethod !== 'PUT')
    links.push ({
      rel,
      href: table.resource,
      action: 'PUT',
      types
    })

  if (!table.disableDelete && curHttpMethod !== 'DELETE')
    links.push ({
      rel,
      href: `${table.resource}?${table.columns.find(c => c.primaryKey).name}=1`,
      action: 'DELETE',
      types: []
    })

  return links
}

function buildRouter(table) {
  if (!table.preprocessors) table.preprocessors = (req, res, next) => next()

  router.use('/' + table.resource, table.preprocessors, wrap(async (req, res, next) => { // eslint-disable-line
    if (
      (req.method === 'POST' && table.disableAdd) ||
      (req.method === 'PUT' && table.disableEdit) ||
      (req.method === 'DELETE' && table.disableDelete)
    ) return res.sendStatus(405)

    let payload = {}, status

    try {
      const sql = generateSql(table, req)

      if (sql.countQuery) { // GET
        const dbRes = await Promise.all([
          db.query(sql.countQuery, sql.queryParams),
          db.query(sql.query, sql.queryParams)
        ])

        payload.total = Math.ceil(dbRes[0][0].total / 10)
        payload.table = dbRes[1]

        processTransforms(payload.table, table.columns)
      }
      else await db.query(sql.query, sql.queryParams)
    } catch (err) {
      if (err instanceof ResourceError) {
        status = err.code
        payload = { error: err.resourceErrorMessage }
      } else {
        status = 500
        payload = { error: 'error processing the request' }
      }

      console.error(err)
    }

    if (!status) status = payload ? 200 : 204

    let links = buildHateoasLinks(table, req.method)

    if (table.links) links = links.concat(table.links)

    res.status(status).json({
      ...payload,
      links
    })
  }))

  return router
}

module.exports = buildRouter
