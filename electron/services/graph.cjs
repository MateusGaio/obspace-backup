"use strict";

const { buildGraph, findRelevantNotes } = require("./graph/indexer.cjs");
const { readNote, commitNotesToVault } = require("./graph/vault-notes.cjs");

module.exports = {
  buildGraph,
  readNote,
  commitNotesToVault,
  findRelevantNotes
};
