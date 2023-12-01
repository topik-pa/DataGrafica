/* eslint-disable max-len */
/**
 * @file dTable - A Dynamic Pure JS Table
 * @description dTable provides data sorting, filtering and pagination
 * @author Marco Pavan
 * @version 1.0
 * @copyright Marco Pavan 2023
 */

const $table = document.getElementById('dtable')
const $pagination = $table.querySelector('#pagination')
const $navigation = $table.querySelector('ul')
const $tHeader = $table.querySelector('thead')
const $filters = $tHeader.querySelectorAll('input')

let filterTimer

const tConfig = { // APIRELATED
  url: '/assets/data/posts.json',
  limit: 25,
  page: 0,
  total: undefined,
  pages: undefined,
  start: undefined,
  end: undefined,
  filterReqDelay: 800
}

const queryString = {
  filters: [],
  sorts: [],
  get () {
    let qs = '?'
    qs += `page=${tConfig.page}`
    qs += `&limit=${tConfig.limit}`
    this.sorts.forEach(sort => {
      qs += `&sortby=${encodeURIComponent(sort.sortBy)}`
      qs += `&order=${sort.order}`
    })
    this.filters.forEach(f => {
      qs += `&filterby=${encodeURIComponent(f.filterBy)}`
      qs += `&filter=${encodeURIComponent(f.filter)}`
    })
    return qs
  }
}

const dateFilter = (date = undefined) => {
  return new Date(date).toLocaleString()
}

$navigation.addEventListener('click', async (e) => {
  const nextPage = +e.target.dataset.page
  if (isNaN(nextPage) || tConfig.page === nextPage) return
  tConfig.page = nextPage
  await loadRowsData()
})

$tHeader.addEventListener('click', async (e) => {
  const sortBy = e.target.dataset.path
  if (!sortBy) return
  const order = e.target.dataset.order
  /* for (const th of $tHeader.getElementsByTagName('th')) {
    th.removeAttribute('data-order')
  } */
  e.target.dataset.order = order === 'asc' ? 'desc' : order === 'desc' ? 'asc' : 'asc'
  queryString.sorts = queryString.sorts.filter((s) => {
    return s.sortBy !== sortBy
  })
  queryString.sorts.push({ sortBy, order: e.target.dataset.order })
  await loadRowsData()
})

const startFilterRequestTimer = (el) => {
  // Add a little pause before call the remote server (only on filters)
  filterTimer = setTimeout(async () => {
    const filter = el.value
    const filterBy = el.parentElement.dataset.path
    queryString.filters = queryString.filters.filter((f) => {
      return f.filterBy !== filterBy
    })
    queryString.filters.push({ filterBy, filter })
    await loadRowsData()
  }, tConfig.filterReqDelay)
}
for (const $filter of $filters) {
  $filter.addEventListener('input', async (e) => {
    if (!filterTimer) {
      startFilterRequestTimer(e.target)
    } else {
      clearTimeout(filterTimer)
      startFilterRequestTimer(e.target)
    }
  })
}

const getBoostData = (data) => {
  let str = ''
  data.forEach(boost => {
    const startDate = boost.started ? new Date(boost.started).toLocaleDateString() : null
    const endDate = boost.started ? new Date((boost.started + (1000 * 60 * 60 * 24 * boost.days))).toLocaleDateString() : null
    const today = Date.now()
    const engagement = (boost.reactions && boost.followers) ? ((boost.reactions / boost.followers) * 100).toFixed(2) : null
    str += `<div><div class="${today < endDate ? 'green' : 'red'}">&#9673;</div>`
    str += `${boost.price}€ (${boost.social})`
    str += '<br>'
    str += `Target: ${boost.target}`
    str += '<br>'
    str += `Start: ${startDate}`
    str += '<br>'
    str += `End: ${endDate}`
    str += '<br>'
    str += `Cpi: ${boost.cpi || 'ND'}`
    str += '<br>'
    str += `Engagement: ${engagement || 'ND'} %`
    str += '<hr>'
    str += '</div>'
  })
  return str
}

/**
 * buildRows
 * @description Build a table row for every result found on remote data
 */
const buildRows = (rows) => {
  const $tBody = $table.getElementsByTagName('tbody')[0]
  $tBody.innerText = ''
  for (const row of rows) {
    const $tr = document.createElement('tr')
    // APIRELATED
    $tr.innerHTML = `
      <td><img class="preview" src="/assets/images/posts/post-${row.id}.png" alt="${row.name} post preview"/></td>
      <td><a href="/post/${row.id}" title="Go to post: ${row.id}">${row.id}</a></td>
      <td>${row.name}</td>
      <td>${new Date(row.created).toLocaleDateString()}</td>
      <td>
        <img class="icon" src="/assets/images/status_${row.posted[0].status}.jpg" alt="${row.posted[0].status ? 'Post active' : 'Post disabled'}" title="${row.posted[0].status ? 'Post active' : 'Post disabled'}"/>
       |
       <img class="icon" src="/assets/images/status_${row.posted[0].story}.jpg" alt="${row.posted[0].story ? 'Story active' : 'Story disabled'}" title="${row.posted[0].story ? 'Story active' : 'Story disabled'}"/>
      </td>
      <td>
        <img class="icon" src="/assets/images/status_${row.posted[1].status}.jpg" alt="${row.posted[1].status ? 'Post active' : 'Post disabled'}" title="${row.posted[1].status ? 'Post active' : 'Post disabled'}"/>
      </td>

      <td>
        ${getBoostData(row.boost)}
      </td>
    `
    // APIRELATED
    $tBody.appendChild($tr)
  }
}

/**
 * updateDOMPagination
 * @description Update pagination data like current totals and pages number
 */
const updateDOMPagination = () => {
  $pagination.querySelector('#total').innerText = tConfig.total
  $pagination.querySelector('#start').innerText = tConfig.start
  $pagination.querySelector('#end').innerText = tConfig.end
  $pagination.querySelector('#page').innerText = (tConfig.page + 1)
  $pagination.querySelector('#pages').innerText = tConfig.pages
}

/**
 * setNavigation
 * @description Print pagination links
 */
const setNavigation = () => {
  $navigation.innerText = ''
  for (let i = 0; i < tConfig.pages; i++) {
    const $li = document.createElement('li')
    $li.innerText = (i + 1)
    $li.setAttribute('data-page', (i))
    if (i === tConfig.page) $li.classList.add('active')
    $navigation.appendChild($li)
  }
}

/**
 * loadRowsData
 * @description Load remote data, inits configuration data, starts pagination features
 * @async
 */
const loadRowsData = async () => {
  $table.classList.add('loading')
  await fetch(tConfig.url + queryString.get())
    .then(response => {
      if (!response.ok) throw (Error(`Status: ${response.status}. ${response.statusText}`))
      return response.json()
    })
    .then((json) => {
      buildRows(json.posts) // APIRELATED
      tConfig.total = json.total // APIRELATED
      tConfig.pages = Math.ceil(tConfig.total / tConfig.limit)
      tConfig.end = tConfig.limit * (tConfig.page + 1)
      tConfig.start = (tConfig.end - tConfig.limit) + 1
      if (tConfig.end > tConfig.total) {
        tConfig.end = tConfig.total
        tConfig.start = (tConfig.limit * (tConfig.pages - 1)) + 1
      }
    })
    .catch((error) => {
      tConfig.total = 0
      tConfig.page = -1
      tConfig.pages = 0
      tConfig.start = 0
      tConfig.end = 0
      $table.classList.add('error')
      console.error(error)
    })
    .finally(() => {
      updateDOMPagination()
      setNavigation()
      $table.classList.remove('loading')
    })
}

/**
 * Main object
 * @type {{init: function}}
 */
const dTable = {
  init: async () => {
    await loadRowsData()
  }
}

export default dTable
