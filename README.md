r2p
===

r2p is a Javascript Regex to PEG converter. It parses regexes using [PEGjs](http://pegjs.majda.cz) with a grammar inspired by [Kevin Mehall's regexp grammar](https://github.com/kevinmehall/regex-derivs/blob/master/parse-regex.pegjs) and converts them to PEGjs-compatible grammar using the method described in [Marcelo Oikawa, Roberto Ierusalimschy and Ana Lucia de Moura's "Converting regexes to Parsing Expression Grammars"](http://www.inf.puc-rio.br/~roberto/docs/ry10-01.pdf).

Building
--------

You need PEGjs to build the regular expression parser used by r2p.  If you don't have it already installed globally, you can install it locally using `npm install` in the source directory.  You can then run `make` to build the parser.

Usage
-----

You need both `regexParser.js` and `converter.js` to use r2p. You can then call the `r2p` function, passing it the regular expression to convert as a string.

Limitations
-----------

For now the parser only supports a subset of JS regular expressions. Lookahead (`(?=x)`, `(?!x)`) and lookbehind (`(?<x)`, `(?<!x)`) assertions, numeric (`x{n,m}`) and (un-)greedy (`x*?`, `x*+`) quantifiers as well as non-capturing groups (`(?:x)`) are not recognized by the parser.  Capturing groups are only used to group expressions together and will not be translated into separate non-terminals in the output grammar.  You may also have issues with some escape sequences.  Hopefully those will be fixed in a future release.

License
-------

r2p is public domain. Do whatever you please with it, but do not hesitate to drop a note if you find it interesting.
