PEGJS=pegjs
PEGJSFLAGS=--export-var regexParser

regexParser.js: regex.pegjs
	$(PEGJS) $(PEGJSFLAGS) $< $@
