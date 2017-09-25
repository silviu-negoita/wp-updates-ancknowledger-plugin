jQuery(document).ready(() => {
  jQuery("#" + WPUAConstants.WPUA_OVERVIEW_PAGE_CONTAINER_ID).ready(() => {
    jQuery("#" + WPUAConstants.WPUA_OVERVIEW_PAGE_CONTAINER_ID).addClass("table-responsive wpua_overview_container")
    getOverviewData(renderOverviewContent)
  });
})


function getOverviewData(callback) {
  let param = {}
  param[WPUAConstants.LOGGED_USER_PARAMETER_NAME] = WPUAConstants.LOGGED_USER

  jQuery.ajax({
    type: "GET",
    url: WPUAConstants.RELATIVE_SITE_URL + "/wp-json/wpua/api/getOverviewData",
    dataType: "json",
    data: param,
    success: callback
  });

}

/*
 * Entry point for rendering UA Overview Page content.
 */
function renderOverviewContent(result) {
  let rootElement = jQuery("#" + WPUAConstants.WPUA_OVERVIEW_PAGE_CONTAINER_ID).get(0)

  if (rootElement == undefined) {
    return
  }
  // attach the table
  rootElement.appendChild(creatOverviewTable(result));

  // now remove the sidebar and make the content wider
  jQuery("#primary").removeClass("col-md-8")
  jQuery("#primary").addClass("col-md-12")
  jQuery("#secondary").remove()

  // activate fixed header on table
  jQuery("#wpua-table-element").floatThead({
    scrollContainer: ($table) => {
      return jQuery("#" + WPUAConstants.WPUA_OVERVIEW_PAGE_CONTAINER_ID)
    }
  });
}

function creatOverviewTable(data) {
  let categories_and_articles = data[WPUAConstants.REST_OVERVIEW_PAGE_RESULT_CATEGORIES_FIELD]
  let all_users = data[WPUAConstants.REST_WIDGET_RESULT_DATA_ALL_USERS_FIELD]
  tableElement = document.createElement("table");
  jQuery(tableElement).attr("id", "wpua-table-element")
  jQuery(tableElement).addClass("table table-hover")


  // append table header
  tableElement.appendChild(createOverviewTableHeader(all_users))
  // append table content
  let tbody = document.createElement("tbody")
  tableElement.appendChild(tbody)

  categories_and_articles.forEach((category) => {
    tbody.appendChild(createOverviewTableCategoryRow(category, all_users))
    if (category.hasOwnProperty('articles')) {
      category['articles'].forEach((article) => {
        tbody.appendChild(createOverviewTableArticleRow(article, all_users, category['nesting_level'] + 1))
      })
    }
  })

  return tableElement;
}

function createOverviewTableCategoryRow(category, all_users) {
  let nesting_level = category['nesting_level']
  let tr = document.createElement("tr")

  // create first column
  tr.appendChild(createOverviewTableCategoryCell(category['name'], nesting_level))
  jQuery(tr).attr("level", nesting_level)
  // now append empty columns
  for (var i = 0; i < all_users.length + 1; i++) {
    tr.appendChild(document.createElement("td"));
  }
  return tr
}

function createOverviewTableCategoryCell(category_name, nesting_level) {
  let td = document.createElement("td")
  wrapper = document.createElement("div")
  jQuery(wrapper).css('margin-left', (nesting_level * 10) + 'px');
  jQuery(wrapper).css('width', '400px');

  jQuery(wrapper).click(onCategoryIconClickEventHandler)
  jQuery(wrapper).css("cursor", "pointer")

  td.appendChild(wrapper);

  icon = document.createElement("i")
  jQuery(icon).addClass("fa fa-folder-open-o ")
  
  wrapper.appendChild(icon)


  text = document.createElement("span")
  text.innerHTML = "<strong> " + category_name + "</strong>"
  wrapper.appendChild(text)

  return td
}

/*
 * This is a click handler for category icon. This represents the entry point for tree logic
 */
function onCategoryIconClickEventHandler(event) {
  let parentTr = jQuery(event.target).closest("tr")[0]
  let allNextSiblingsWithLowerLevel = []
  let next = jQuery(parentTr).next("tr")[0]

  while (next != undefined && jQuery(next).attr('level') > jQuery(parentTr).attr('level')) {
    allNextSiblingsWithLowerLevel.push(next)
    next = jQuery(next).next("tr")[0]
  }

  icon = jQuery(parentTr).find("i")[0]
  if (jQuery(icon).hasClass('fa-folder-open-o')) {
    // needs collapse
    jQuery(icon).removeClass('fa-folder-open-o')
    jQuery(icon).addClass('fa-folder-o')
    allNextSiblingsWithLowerLevel.forEach((sibling) => {
      jQuery(sibling).fadeOut(200)
    })
  } else {
    // needs to expand
    jQuery(icon).removeClass('fa-folder-o')
    jQuery(icon).addClass('fa-folder-open-o')
    allNextSiblingsWithLowerLevel.forEach((sibling) => {
      jQuery(sibling).fadeIn(200)
      // but also check if categories already collapsed. if it is collapsed, expand it too
      let icons = jQuery(sibling).find("i")
      if (icons.length > 0) {
        jQuery(icons[0]).removeClass('fa-folder-o')
        jQuery(icons[0]).addClass('fa-folder-open-o')
      }
    })
  }

}


function createOverviewTableArticleRow(article, all_users, nesting_level) {
  let tr = document.createElement("tr")
  jQuery(tr).attr("level", nesting_level)
  // frst column, with article name
  tr.appendChild(createOverviewTableArticleNameCell(article, nesting_level))

  let last_version = undefined

  // second column, with last version
  if (article['all_versions'] != undefined) {
    last_version = article['all_versions'][0]
    tr.appendChild(createVersionLabel(last_version[0], "label-success"))
  } else {
    td = document.createElement("td")
    td.innerHTML = "N/A"
    tr.appendChild(createVersionLabel("N/A", "label-warning"))
  }

  all_users.forEach((user) => {
    tr.appendChild(createOverviewTableUserColumnCell(article['wpua_recorded_acks'], user, last_version));
  })

  return tr
}

function createVersionLabel(version, clazz) {
  td = document.createElement('td')
  jQuery(td).css("text-align", "center")

  label = document.createElement("label")
  label.innerHTML = version
  jQuery(label).addClass("label " + clazz)
  jQuery(label).css("font-size", "13px")

  td.appendChild(label)

  return td
}


/**
 * 
 */
function createOverviewTableUserColumnCell(recorded_acks, user, last_version) {
  let td = undefined
  let bigger_version = undefined

  if (last_version == undefined) {
    return document.createElement('td')
  } else if (recorded_acks != undefined) {
    recorded_acks.forEach((recorded_ack) => {
      if (jQuery.inArray(user['ID'], recorded_ack['ackUsers']) > -1) {
        // we found a version for this user
        if (bigger_version == undefined || bigger_version < recorded_ack['version']) {
          bigger_version = recorded_ack['version']
        }
      }
    })
  }

  if (bigger_version != undefined) {
    if (bigger_version != last_version[0]) {
      td = createVersionLabel(bigger_version, "label-danger")
    } else {
      td = createVersionLabel(bigger_version, "label-success")
    }
  } else {
    td = createVersionLabel("None", "label-danger")
  }

  return td
}

function createOverviewTableArticleNameCell(article, nesting_level) {
  let td = document.createElement("td")
  jQuery(td).css('color', 'royalblue');

  wrapper = document.createElement("div")
  jQuery(wrapper).css('width', '400px');
  jQuery(wrapper).css('margin-left', ((nesting_level) * 10) + 'px');
  td.appendChild(wrapper);

  // create the first column, with article name
  icon = document.createElement("i")
  jQuery(icon).addClass("fa fa-level-up fa-rotate-90")

  wrapper.appendChild(icon)

  article_anchor = document.createElement("a")
  article_anchor.innerHTML = "<a href=\"" + article['permalink'] + "\"><strong> " + article['post_title'] + "<strong> </a>"
  wrapper.appendChild(article_anchor)
  return td
}

function createOverviewTableHeader(all_users) {
  let thead = document.createElement("thead")
  let tr = document.createElement("tr")

  thead.appendChild(tr)
  //append first column "Categories / Articles"
  th = document.createElement("th")
  jQuery(th).addClass("cell")
  th.innerHTML = "Categories / Articles"
  jQuery(th).addClass("col-md-4 col-sm-4")
  tr.appendChild(th)
  // append second column "Last version"
  th = document.createElement("th")
  th.innerHTML = "Last version"
  tr.appendChild(th)
  // now append all users
  all_users.forEach((user) => {
    th = document.createElement("th")
    th.innerHTML = user['display_name']
    tr.appendChild(th)
  })
  return thead
}