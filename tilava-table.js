// TilavaTable: Supports very large scrollable tables.
// See http://github/stephenbez/tilava-table/ for docs and latest version.
// Licensed under the BSD 2-Clause License
(function() {

function bound(number, lower, upper) {
    if (lower > upper) {
        throw "Lower bound must be less than or equal to upper bound";
    }

    if (number < lower) return lower;
    if (number > upper) return upper;

    return number;
}

/**
 * --- Required settings ---
 *
 *   template [jQuery element]
 *     jQuery element of the 'template' row. This is a placeholder that contains the structure
 *     of a typical row.
 *
 *   parent [jQuery element]
 *     Parent element of template row.
 *
 *   render [function(row [jQuery element], record [object], index [int])]
 *     User supplied callback function that is responsible for rendering a record in the row.
 *     TilavaTable shall create a new row for you and insert into the necessary place in the
 *     DOM - the render() function should then populate dynamic content based on the record.
 *       row: jQuery element of inserted row
 *       record: The object passed in to {append,prepend}Record()
 *       index: Index of row (first row is 0, next is 1)
 *
 *   visibleRows [int]:
 *     Max number of rows that should be visible at any time. Any more than that and the
 *     scrollbar appears.  Set to Infinity to show as many rows as possible before forcing the
 *     whole page to have a scrollbar.
 *
 * --- Optional settings ---
 *
 *   displayReversed [boolean] (default: false)
 *     If set, the table shall be rendered in reverse order - most recently appended rows shall
 *     go at the top. The advantage this has over simply prepending records is that it maintains
 *     a sensible index for each new row (whereas prepend would always have an index of 0), thus
 *     making things like row striping effects simpler.
 *
 *   templateClassName [string] (default: 'template')
 *     The name of the CSS class name used to mark the template row.
 *
 *   tableWrapperClassName [string] (default: 'tilava-table-wrapper')
 *     The name of the CSS class name used to wrap the table.
 *
 *   scrollbarClassName [string] (default: 'tilava-table-scrollbar')
 *     The name of the CSS class name used for the scrollbar div.
 */
window.TilavaTable = function(spec) {
    var that = this;
    this.spec = spec;

    this.spec.displayReversed = this.spec.displayReversed || false;
    this.spec.tableWrapperClassName = this.spec.tableWrapperClassName || 'tilava-table-wrapper';
    this.spec.scrollbarClassName = this.spec.scrollbarClassName || 'tilava-table-scrollbar';

    if (this.spec.visibleRows === Infinity) {
        // On resize, set visible rows to infinity, so that it is again set to the appropriate value that doesn't cause scrolling
        $(window).resize(function () {
            that.spec.visibleRows = Infinity;
            that.updateUI();
        });
    }

    // Default scroll wheel pixels by OS: Linux=53; Windows=100;
    this.spec.scrollWheelPixels = this.spec.scrollWheelPixels || 53;

    this.records = [];
    var $table = this.spec.parent.parent();
    this.currentIndex = 0;

    var $beforeDiv = $('<div class="' + this.spec.tableWrapperClassName  + '" style="position: relative; display: inline-block;"/>');
    $table.wrap($beforeDiv);
    this.$spacer = $('<div style="width: 1px" />');
    this.$scrollbarDiv = $('<div class="' + this.spec.scrollbarClassName + '" style="position: absolute; right: -15px; top: 0; bottom: 0; overflow-y: scroll; overflow-x: hidden; display: none; width: 15px;"/>');
    this.$scrollbarDiv.append(this.$spacer);
    $table.after(this.$scrollbarDiv);

    this.$scrollbarDiv.scroll(function() {
        var scrollPosition = that.$scrollbarDiv.scrollTop();
        var scrollRange = that.spacerHeight - that.$scrollbarDiv.height();

        var itemId = 0;

        if (scrollRange != 0) {
            itemId = Math.floor(scrollPosition/scrollRange * bound(that.records.length - that.spec.visibleRows, 0, Infinity));
        }

        that.displayRecords(itemId);
    });

    $table.bind('mousewheel', function(event, delta, deltaX, deltaY) {
        if (delta === undefined) return;
        event.preventDefault();

        var newPosition = that.$scrollbarDiv.scrollTop() - delta * that.spec.scrollWheelPixels;

        that.$scrollbarDiv.scrollTop(newPosition);
    });

    var adjustScrollbarForZoom = function () {
        // Chrome specific hack for positioning scrollbar correctly after zooming in and out
        var screenCssPixelRatio = (window.outerWidth - 8) / window.innerWidth;
        var newWidth = Math.ceil(15/screenCssPixelRatio);
        $("." + that.spec.scrollbarClassName).css("right", -newWidth).css("width", newWidth);
    };

    if ($.browser["webkit"]) {
        $(window).resize(adjustScrollbarForZoom);
        adjustScrollbarForZoom();
    }
};

TilavaTable.prototype.appendRecord = function(record) {
    this.records.push(record);

    this.updateUI();
};

function chunk(theArray, itemsPerChunk) {
    var startIndex = 0;
    var chunks = [];

    while (startIndex < theArray.length) {
        chunks.push(theArray.slice(startIndex, startIndex + itemsPerChunk));
        startIndex += itemsPerChunk;
    }
    return chunks;
}

TilavaTable.prototype.appendRecords = function(records) {
    // Can't do this.records.push.apply(this.records, records) because of exceeding max call size
    for (var i = 0; i < records.length ; i++) {
        this.records.push(records[i]);
    }

    this.updateUI();
};

TilavaTable.prototype.prependRecord = function(record) {
    this.records.unshift(record);

    this.updateUI();
};

TilavaTable.prototype.prependRecords = function(records) {
    var chunks = chunk(records, 50000);

    // We must split array into chunks because otherwise we exceed max call size
    // http://code.google.com/p/chromium/issues/detail?id=83884
    for (var i = chunks.length-1; i >= 0; i--) {
        var args = [0, 0].concat(chunks[i]);
        Array.prototype.splice.apply(this.records, args);
    }

    this.updateUI();
};

TilavaTable.prototype.insertRecord = function(index, record) {
    this.records.splice(index, 0, record);

    this.updateUI();
};

TilavaTable.prototype.removeRecord = function(index) {
    this.records.splice(index, 1);

    this.updateUI();
};

TilavaTable.prototype.updateUI = function() {
    // When updateUI() is called, we defer the rendering to the next cycle in the event loop.
    // If multiple calls are made in the same event loop, we'll still only get called once.
    // This allows tight loops to call appendRecord() multiple times, yet still on one updateUI.
    if (!this.updateUIRequested) {
        var that = this;
        setTimeout(function() {
            if (that.elementHeight === undefined && that.records.length === 0) {
                that.updateUIRequested = false;
                return;
            }

            // We make the assumption that the height of the first row is the same as the height of every other row
            // If this is not true scrollbars may break
            if (that.elementHeight === undefined) {
                that.elementHeight = that.getHeight(that.records[0]);
            }

            that.displayRecords(that.currentIndex);

            that.spacerHeight = that.$scrollbarDiv.height() + bound(that.records.length - that.spec.visibleRows, 0, Infinity) * that.elementHeight;

            // Firefox can't create a spacer of height more than a few ten million because of this bug: https://bugzilla.mozilla.org/show_bug.cgi?id=373875
            that.$spacer.height(that.spacerHeight);

            that.$scrollbarDiv.toggle(that.records.length > that.spec.visibleRows);

            that.updateUIRequested = false;
        }, 0);
        this.updateUIRequested = true;
    }
};

function windowCurrentlyHasScrollBars() {
    return document.body.scrollHeight > document.body.clientHeight;
}

TilavaTable.prototype.displayRecords = function(startIndex) {
    this.currentIndex = startIndex;

    this.spec.parent.empty();

    var rowsToDisplay = Math.min(this.spec.visibleRows, this.records.length);

    startIndex = bound(startIndex, 0, this.records.length - rowsToDisplay);

    var endIndex = Math.min(this.records.length - 1, (startIndex + this.spec.visibleRows - 1));

    var k = 0;
    if (this.spec.displayReversed) {
        for (var j = this.records.length - 1 - startIndex; j >= this.records.length - 1 - endIndex; j--, k++) {
            this.renderIndex(j);

            if (this.spec.visibleRows == Infinity && windowCurrentlyHasScrollBars()){
                // To avoid confusion of a table that appears empty, but actually has elements in it, display a minimum of 3 rows
                this.spec.visibleRows = bound(k, 3, Infinity);
                this.displayRecords(startIndex);
                break;
            }
        }
    } else {
        for (var i = startIndex; i <= endIndex; i++, k++) {
            this.renderIndex(i);

            if (this.spec.visibleRows == Infinity && windowCurrentlyHasScrollBars()){
                // To avoid confusion of a table that appears empty, but actually has elements in it, display a minimum of 3 rows
                this.spec.visibleRows = bound(k, 3, Infinity);
                this.displayRecords(startIndex);
                break;
            }
        }
    }

};

TilavaTable.prototype.renderIndex = function(index) {
    var record = this.records[index];

    var $row = this.spec.template.clone().removeClass(this.spec.templateClassName || "template");
    this.spec.render($row, record, index);
    this.spec.parent.append($row);
};

TilavaTable.prototype.getHeight = function(record) {
    var $row = this.spec.template.clone().removeClass(this.spec.templateClassName || "template");
    this.spec.render($row, record, -1);
    $row.css('visibility', 'hidden');
    this.spec.parent.prepend($row);
    var height = $row.height();
    $row.remove();
    return height;
};

TilavaTable.prototype.clear = function() {
    this.records = [];
    this.currentIndex = 0;
    this.updateUI();
};

})();
