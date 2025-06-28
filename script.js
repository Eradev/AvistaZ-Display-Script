// ==UserScript==
// @name        AvistaZ Torrent Grouping and Filtering
// @description Group items of the same release together, and allow filtering by tags and languages
// @namespace   eradev
// @match       https://avistaz.to
// @match       https://avistaz.to/torrents
// @match       https://avistaz.to/torrents?*
// @match       https://avistaz.to/torrents/*
// @version     1.0
// @require     https://code.jquery.com/jquery-3.7.1.slim.min.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// ==/UserScript==

var $ = window.jQuery;

$("body").append(`<style>
tr .torrent-file span,
tr.alternate .torrent-poster,
tr.alternate .torrent-file b,
tr.alternate .torrent-icon,
tr.alternate td:first-child {
  display: none;
}

tr div, tr td {
  white-space: nowrap;
}

div.torrent-poster {
  float: unset!important;
  display: inline;
}

div.torrent-poster img {
  vertical-align: top;
  margin-left: 3px;
}

.torrent-filename {
  margin-left: 0;
}

.torrent-file b {
  font-size: 18px;
  font-weight: normal;
  line-height: 32px;
  color: #FFF;
}

.torrent-filename i {
  font-style: normal;
  color: #C0D0DF;
}

tr:not(.alternate) td:not(:first-child):not(:nth-child(2)) {
  padding-top: 37px;
}
</style>`);

// Default tags and audio languages to filter out (user-configurable)
let tagsToFilterOut = GM_getValue("tagsToFilterOut", []);
let audioLanguagesToFilterOut = GM_getValue("audioLanguagesToFilterOut", []);

// Function to prompt the user to input tags and audio languages and store them
function setFilterOutOptions() {
  const tags = prompt("Enter tags to filter out, separated by commas:", tagsToFilterOut.join(", "));
  if (tags !== null) {
    tagsToFilterOut = tags.split(",").map(tag => tag.trim().toLowerCase());
    GM_setValue("tagsToFilterOut", tagsToFilterOut);
  }

  const languages = prompt("Enter audio languages to filter out, separated by commas:", audioLanguagesToFilterOut.join(", "));
  if (languages !== null) {
    audioLanguagesToFilterOut = languages.split(",").map(lang => lang.trim().toLowerCase());
    GM_setValue("audioLanguagesToFilterOut", audioLanguagesToFilterOut);
  }

  alert(`Tags updated: ${tagsToFilterOut.join(", ")}\nAudio Languages updated: ${audioLanguagesToFilterOut.join(", ")}`);
  location.reload();
}

// Register a menu command to update the filter options
GM_registerMenuCommand("Set Filter Options", setFilterOutOptions);

// Function to check if a torrent has any of the tags to filter out
function hasFilteredTags(torrent) {
  const tags = torrent.find('.badge-extra .fa-tag + a');

  return Array.from(tags).some(tag => tagsToFilterOut.includes(tag.textContent.trim().toLowerCase()));
}

// Function to check if a torrent has any of the audio languages to filter out
function hasFilteredAudioLanguages(torrent) {
  const audioLanguages = torrent.find('a[data-original-title]');

  return Array.from(audioLanguages).some(lang => audioLanguagesToFilterOut.includes(lang.getAttribute('data-original-title').trim().toLowerCase()));
}

const getTitle = e => e
  .find(".torrent-filename")
  .text()
  .replace(/[\r\n]/g, "")
  .trim();

const getName = e => getTitle(e)
  .replace(/\(.*\s*BATCH\)?/, "")
  .replace(/\(?((20\d\d|19\d\d)(?:(?!\s*BATCH|:.*)))\)?.*/, "\($1\)")
  .replace(/(S\d\dE\d+\b|S\d\d\b|\bE\d+\b).*/, "")
  .replace(/\.(?!\s)/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const findItem = (i, r) => {
  const n = i.next();

  if (n.length &&
      n.hasClass("alternate") &&
      (getTitle(n) < r)) {

      return findItem(n, r);
  }

  return i;
};

const items = [];
const yearReg = /\s\(\d{4}\)$/i;

for (let r_element of $("table:first tbody tr").get()) {
  const r = $(r_element);

  if (hasFilteredTags(r) || hasFilteredAudioLanguages(r)) {
    r.remove();

    continue;
  }

  const n = getName(r);

  r.find(".torrent-filename").html((i, h) => h
    .replace(/[\r\n]/g, "")
    .replace(/\(?((20\d\d|19\d\d)(?:(?!\s*BATCH|:.*)))\)?/, "\($1\)")
    .replace(/\.(?!\s)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll(n.replaceAll('&','&amp;'), `<b>${n.replaceAll('&','&amp;')}<br></b> ┖━ `));

  r.find("td .torrent-file .torrent-poster").appendTo(r.find("td:first"));

  const key = n.replace('\'', '').toLowerCase();
  const item = items[key];

  if (!item) {
    items[key] = r;
    r.find("td:first").attr("rowspan", 1);
  } else {
    const rowspan = parseInt(item.find("[rowspan]").attr("rowspan"));

    if (getTitle(item) > getTitle(r)) {
      r.find("td:first").attr("rowspan", rowspan + 1);
      r.detach().insertBefore(item);
      item.addClass("alternate").find("td:first").removeAttr("rowspan");
      items[key] = r;
    } else {
      r.addClass("alternate").detach().insertAfter(findItem(item, getTitle(r)));
      item.find("[rowspan]").attr("rowspan", rowspan + 1);
    }
  }
}