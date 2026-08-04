jQuery.fn.extend({

  isNbDropdown: function () {
    return this.closest(".nb-dropdown").length > 0;
  },

  isNbDropdownOpened: function () {
    return this.closest(".nb-dropdown").find("div.nb-dropdown-content:first").is(":visible");
  },

  nbDropdown: function (options, current) {
    var items = "";
    options.forEach(function (option) {
      items += "<a href='javascript:;' data-id='" + option.id + "' class='focusable'>" + (option.description != null ? option.description : (option.seasonNumber != null ? option.seasonNumber : "")) + "</a>";
    });

    var currentId = current < options.length ? options[current].id : "";
    var currentDescription = current < options.length ? (options[current].description != null ? options[current].description : (options[current].seasonNumber != null ? options[current].seasonNumber : "")) : "";
    var visibility = options.length <= 1 ? 'visibility: hidden;' : '';
    var html = ""
      + "<div class='nb-dropdown-current' data-id='" + currentId + "'  style='display: flex;align-items: center;justify-content: center;padding: 0 0.5em;'>" + currentDescription + "</div>"
      + "<div class='focusable nb-dropdown-button' style='" + visibility + "background: rgb(50 50 50 / 75%);border-radius: 1em;width: 2em;height: 2em;text-align: center;display: flex;align-items: center;justify-content: center;margin:0 10px 10px'><span class='fa fa-caret-down'></span></div>"
      + "<div style='flex-basis: 100%;height: 0;'></div>"

      + '<div class="nb-dropdown-content">'
      + items
      + '</div>';

    this.html(html);
  },

  nbDropdownSelect: function () {
    var id = Number(this.data("id")) || 0;
    var $dropdown = this.closest(".nb-dropdown");

    if (id > 0) {
      $dropdown.find(".nb-dropdown-current:first").html(this.text());
      $dropdown.find(".nb-dropdown-current:first").data("id", id);
      this.nbDropdownClose();
    }

    Focus.to($dropdown.find(".nb-dropdown-button:first"));
  },

  nbDropdownOpen: function () {
    var $dropdown = this.closest(".nb-dropdown");

    $dropdown.find("div.nb-dropdown-content:first").show();
    var currentId = $dropdown.find(".nb-dropdown-current:first").data("id");
    var $focus = $dropdown.find(".nb-dropdown-content a[data-id='" + currentId + "']:first");
    Focus.to($focus);

  },

  nbDropdownClose: function () {
    var $dropdown = this.closest(".nb-dropdown");
    $dropdown.find("div.nb-dropdown-content:first").hide();
    Focus.to($dropdown.find(".nb-dropdown-button:first"));
  },

  nbDropdownGetSelected: function () {
    var $dropdown = this.closest(".nb-dropdown");
    return $dropdown.find(".nb-dropdown-current:first").data("id");
  }
  // isNbDropdown: function() {
  //     return this.hasClass("nb-dropdown");
  // },

  // isNbDropdownOpened: function() {
  //     return this.find("div:first").is(":visible");
  // },

  // nbDropdown: function(label, options) {
  //     var items = "";
  //     options.forEach(function(option) {
  //         items += "<a href='#' data-id='" + option.id + "' class='focusable'>" + option.text + "</a>";  
  //     });

  //     var html = '<button class="dropbtn">' + label + '</button>'
  //     + '<div class="nb-dropdown-content">'
  //     + items
  //     + '</div>';

  //     this.html(html);
  // },

  // nbDropdownOpen: function() {
  //     this.find("div:first").show();
  // },

  // nbDropdownClose: function() {
  //     this.find("div:first").hide();
  // },


});