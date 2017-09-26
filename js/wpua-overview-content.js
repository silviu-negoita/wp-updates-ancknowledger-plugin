jQuery(document).ready(() => {
  jQuery("#" + WPUAConstants.WPUA_OVERVIEW_PAGE_CONTAINER_ID).ready(() => {
    get_overview_data(render_overview_content)
  });
})


function get_overview_data(callback) {
  make_server_request("GET", "/wp-json/wpua/api/getOverviewData", {}, callback)
}

/*
 * Entry point for rendering UA Overview Page content.
 */
function render_overview_content(result) {
  let rootElement = jQuery("#" + WPUAConstants.WPUA_OVERVIEW_PAGE_CONTAINER_ID).get(0)
  
  if (rootElement == undefined) {
    return
  }

  // attach collapse/expand buttons
  let expand = document.createElement("button")
  jQuery(expand).addClass("btn btn-sm btn-warning")
  expand.innerHTML = "<i class=\"fa fa-minus\"/> Expand all articles"
  jQuery(expand).click(on_expand_all_articles_click_event_handler)
  rootElement.appendChild(expand)

  let collapse = document.createElement("button")
  jQuery(collapse).addClass("btn btn-sm btn-primary")
  jQuery(collapse).click(on_collapse_to_categoriesArticleClickEventHandler)
  collapse.innerHTML = "<i class=\"fa fa-plus\"/>  Collapse to categories"
  rootElement.appendChild(collapse)


  // attach the table
  var table_wrapper = document.createElement("div")
  jQuery(table_wrapper).addClass("table-responsive wpua_overview_container")
  table_wrapper.appendChild(create_overview_table(result));
  rootElement.appendChild(table_wrapper)

  // now remove the sidebar and make the content wider
  jQuery("#primary").removeClass("col-md-8")
  jQuery("#primary").addClass("col-md-12")
  jQuery("#secondary").remove()

  // activate fixed header on table
  jQuery("#wpua-table-element").floatThead({
    scrollContainer: ($table) => {
      return jQuery(table_wrapper)
    }
  });
}

function create_overview_table(data) {
  let categories_and_articles = data[WPUAConstants.REST_OVERVIEW_PAGE_RESULT_CATEGORIES_FIELD]
  let all_users = data[WPUAConstants.REST_WIDGET_RESULT_DATA_ALL_USERS_FIELD]
  tableElement = document.createElement("table");
  jQuery(tableElement).attr("id", "wpua-table-element")
  jQuery(tableElement).addClass("table table-hover")

  // append table header
  tableElement.appendChild(create_overview_table_header(all_users))
  // append table content
  let tbody = document.createElement("tbody")
  tableElement.appendChild(tbody)

  categories_and_articles.forEach((category) => {
    // apeend the category row
    tbody.appendChild(create_overview_table_category_row(category, all_users))
    if (category.hasOwnProperty('articles')) {
      // append articles for this category
      category['articles'].forEach((article) => {
        tbody.appendChild(create_overview_table_article_row(article, all_users, category['nesting_level'] + 1))
      })
    }
  })

  return tableElement;
}

function create_overview_table_category_row(category, all_users) {
  let nesting_level = category['nesting_level']
  let tr = document.createElement("tr")
  jQuery(tr).attr("category_id", category['cat_ID'])
  jQuery(tr).attr("category_parent", category['category_parent'])
  jQuery(tr).addClass("is-category")
  
  // create first column
  tr.appendChild(create_overview_table_category_cell(category['name'], nesting_level))
  jQuery(tr).attr("level", nesting_level)
  // now append empty columns
  for (var i = 0; i < all_users.length + 1; i++) {
    tr.appendChild(document.createElement("td"));
  }
  return tr
}

function create_overview_table_category_cell(category_name, nesting_level) {
  let td = document.createElement("td")
  let wrapper = document.createElement("div")
  jQuery(wrapper).css('margin-left', (nesting_level * 10) + 'px');
  jQuery(wrapper).css('width', '400px');

  jQuery(wrapper).click(on_category_icon_click_event_handler)
  jQuery(wrapper).css("cursor", "pointer")

  td.appendChild(wrapper);

  let icon = document.createElement("i")
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
function on_category_icon_click_event_handler(event) {
  let category_row_element = jQuery(event.target).closest("tr")[0]
  
  icon = jQuery(category_row_element).find("i")[0]
  if (jQuery(icon).hasClass('fa-folder-open-o')) {
    collapse_or_expand_category(category_row_element, true)
  } else {
    collapse_or_expand_category(category_row_element, false)
  }
}

function on_expand_all_articles_click_event_handler(event) {
  all_categories = jQuery("#wpua-table-element").find(".is-category[level=0]")
  all_categories.get().forEach((category) => {
      collapse_or_expand_category(category, false)
  })
} 

function on_collapse_to_categoriesArticleClickEventHandler(event) {
  all_categories = jQuery("#wpua-table-element").find(".is-category[level=0]")
  all_categories.get().forEach((category) => {
     collapse_to_categories(category)
  })

}

function collapse_to_categories(category) {
  let category_articles = jQuery('#wpua-table-element').find(".is-article[category_parent=" + jQuery(category).attr("category_id") + "]")
  if (category_articles.length >  0) {
    // no articles, so collapse
    collapse_or_expand_category(category, true)
    return
  } 

  let subcategories = jQuery('#wpua-table-element').find(".is-category[category_parent=" + jQuery(category).attr("category_id") + "]")
  subcategories.get().forEach((subcategory) => {
    collapse_to_categories(subcategory)
  })
}


function collapse_or_expand_category(category_row_element, collapse) {
  let allNextSiblingsWithLowerLevel = []
  let next = jQuery(category_row_element).next("tr")[0]
  while (next != undefined && jQuery(next).attr('level') > jQuery(category_row_element).attr('level')) {
    allNextSiblingsWithLowerLevel.push(next)
    next = jQuery(next).next("tr")[0]
  }
  icon = jQuery(category_row_element).find("i")[0]
  allNextSiblingsWithLowerLevel.forEach((sibling) => {
      if (collapse) {
        jQuery(icon).removeClass('fa-folder-open-o')
        jQuery(icon).addClass('fa-folder-o')
        jQuery(sibling).fadeOut(200)
      } else {
        // needs to expand
        jQuery(icon).removeClass('fa-folder-o')
        jQuery(icon).addClass('fa-folder-open-o')
        jQuery(sibling).fadeIn(200)
        // but also check if categories already collapsed. if it is collapsed, expand it too
        let icons = jQuery(sibling).find("i")
        if (icons.length > 0) {
          jQuery(icons[0]).removeClass('fa-folder-o')
          jQuery(icons[0]).addClass('fa-folder-open-o')
        }
      }
  })
}

function create_overview_table_article_row(article, all_users, nesting_level) {
  let tr = document.createElement("tr")
  jQuery(tr).attr("level", nesting_level)
  jQuery(tr).addClass("is-article")
  jQuery(tr).attr("category_parent", article['category_parent'])
  // first column, with article name
  tr.appendChild(create_overview_table_article_name_cell(article, nesting_level))

  let last_version = undefined

  // second column, with last version
  if (article['all_versions'] != undefined) {
    last_version = article['all_versions'][0]
    tr.appendChild(create_version_label(last_version[0], "label-success"))
  } else {
    td = document.createElement("td")
    td.innerHTML = "N/A"
    tr.appendChild(create_version_label("N/A", "label-warning"))
  }

  all_users.forEach((user) => {
    tr.appendChild(create_overview_table_user_column_cell(article['wpua_recorded_acks'], user, last_version));
  })

  return tr
}

function create_version_label(version, clazz) {
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
function create_overview_table_user_column_cell(recorded_acks, user, last_version) {
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
      td = create_version_label(bigger_version, "label-danger")
    } else {
      td = create_version_label(bigger_version, "label-success")
    }
  } else {
    td = create_version_label("None", "label-danger")
  }

  return td
}

function create_overview_table_article_name_cell(article, nesting_level) {
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

function create_overview_table_header(all_users) {
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