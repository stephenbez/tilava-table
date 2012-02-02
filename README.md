Tilava Table
=============

*Tilava Table* is a lightweight Javascript library that can display lots of
data without slowing the browser down.

Named after the Finnish word tilava which means spacious or capable of holding
a great deal.  When creating a table in Javascript with just a few thousand
rows, the DOM manipulations will make the browser sluggish.  Tilava Table
solves this problem by only loading the visible rows into the DOM and loading
additional rows when the user scrolls.

Don't worry about having too much data.  Tilava table can display hundreds of
thousands of rows (1,000,000+ rows in Chrome) without making the UI sluggish.
(In practice displaying that many records in a table probably doesn't make
sense).

Nothing in the library is designed to be browser specific.
Designed with Google Chrome in mind.  Works in Firefox.  Doesn't appear to work
in IE.

There is nothing in Tilava Table that is specific to the `<table>` html
element.  It can be used for any html element such as `<div>`s.

Getting Started
---------------

* [Example](http://***/example.html)
* [Tutorial](http://***/tutorial.html)

Frequently Asked Questions
--------------------------

####How can I make the table as wide as the browser window?####
Use the following style:

    #<id of parent of tilava-table-wrapper> {
        margin-right: 15px;
    }
    
    .tilava-table-wrapper {
        width: 100%;
    }

    #table-id {
        width: 100%;
    }

####How can I do row striping?####
The render function you pass in gets called with an index parameter.  You can
use this parameter to assign different styles for odd and even rows.  This
solution works better than using a css nth-child selector.  If using that
solution, scrolling could cause the background to change colors.

Author
------
Stephen Bezek.  Initial idea from from Joe Walnes.

Contributors
------------
Joe Walnes and Brian Tatnall