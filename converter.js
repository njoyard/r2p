var parts = {
	// Frontends convert RegExes into ASTs
	frontends: {
		regex: regexParser.parse
	},

	// Middle-ends convert RegEx ASTs into PEG ASTs
	middleends: {
		base: (function() {
			function convertContinuation(ast, k, nt) {
				switch (ast.type) {
					/* C(empty, k) = k */
					case "empty":
						return k;

					/* C('c', k) = c k */
					/* C([class], k) = [class] k */
					case "char":
					case "set":
						return {
							type: "concatenation",
							operands: [ast, k]
						};

					case "anyChar":
						return ast;

					/* C(ab, k) = C(a, C(b, k)) */
					case "concatenation":
						return convertContinuation(ast.left, convertContinuation(ast.right, k, nt), nt);

					/* C(a|b, k) = C(a, k) / C(b, k) */
					case "disjunction":
						return {
							type: "disjunction",
							operands: [
								convertContinuation(ast.left, k, nt),
								convertContinuation(ast.right, k, nt)
							]
						};

					/* C(a*, k) = A
						A <- C(a, A) / k */
					case "repeat":
						if (ast.content.type === "char") {
							return ast;
						}

						var idx = nt.length;
						nt.push({
							type: "disjunction",
							operands: [
								convertContinuation(ast.content, {
									type: "nonTerminal",
									content: idx
								}, nt),
								k
							]
						});

						return {
							type: "nonTerminal",
							content: idx
						};

					default:
						throw new Error("Regex frontend: unknown AST type: " + ast.type);
				}
			}

			return function(regexAST) {
				var nonTerminals = [];
				return {
					ast: convertContinuation(regexAST, { type: "empty" }, nonTerminals),
					nonTerminals: nonTerminals
				};
			};
		}())
	},

	// Optimizers simplify a PEG AST
	optimizers: {
		transparent: function(x) { return x; },
		reduce: function(converted) {
			function reduce(ast) {
				// Reduce children first
				if (ast.content) {
					ast.content = reduce(ast.content);
				} else if (ast.operands) {
					ast.operands = ast.operands.map(reduce);
				}

				// Regroup operands inside nested concatenations/disjunctions
				if (ast.type === "concatenation" && ast.operands.every(function(o) { return o.type !== "disjunction"; })
				 || ast.type === "disjunction" && ast.operands.every(function(o) { return o.type !== "concatenation"; })) {
					var ops = ast.operands;
					ast.operands = [];

					ops.forEach(function(o) {
						if (o.operands) {
							o.operands.forEach(function(so) {
								ast.operands.push(so);
							});
						} else {
							ast.operands.push(o);
						}
					});
				}

				if (ast.type === "concatenation") {
					var prev, ops = ast.operands;
					ast.operands = [];

					ops

					// Remove empty operands from concatenations
					.filter(function(o) { return o.type !== "empty"; })

					// Concatenate consecutive char literals in concatenations
					.forEach(function(o) {
						if (prev && prev.type === "char" && o.type === "char") {
							prev.content += o.content;
						} else {
							ast.operands.push(o);
						}

						prev = o;
					});
				}

				// Turn disjunctions with empty alternatives into optionals
				if (ast.type === "disjunction" && ast.operands.some(function(o) { return o.type === "empty"; })) {
					ast.operands = ast.operands.filter(function(o) { return o.type !== "empty"; });

					if (ast.operands.length === 1) {
						ast = {
							type: "optional",
							content: ast.operands[0]
						};
					} else {
						ast = {
							type: "optional",
							content: ast
						};
					}
				}

				return ast;
			}

			return {
				ast: reduce(converted.ast),
				nonTerminals: converted.nonTerminals.map(reduce)
			};
		}
	},

	// Backends convert PEG ASTs into PEG grammar
	backends: {
		pegjs: function(converted) {
			var rules = [];

			function nonTerminalName(idx) {
				return "nonTerminal" + idx;
			}

			function convert(ast, topLevel) {
				if (typeof topLevel !== "boolean")
					topLevel = false;

				switch(ast.type) {
					case "nonTerminal":
						return nonTerminalName(ast.content);

					case "concatenation":
						return ast.operands.map(convert).join(" ");

					case "disjunction":
						if (topLevel)
							return ast.operands.map(convert).join(" / ");
						else
							return "(" + ast.operands.map(convert).join(" / ") + ")";

					case "repeat":
						return convert(ast.content) + "*";

					case "optional":
						return convert(ast.content) + "?";

					case "char":
						return '"' + ast.content + '"';

					case "set":
						return "[" + ast.inverted + ast.content.join('') + "]";

					case "anyChar":
						return ".";

					case "empty":
						return '""';

					default:
						throw new Error("PEGJS backend: unknown AST type: " + ast.type);
				}
			}

			rules = converted.nonTerminals.map(function(nt, idx) {
				return {
					name: nonTerminalName(idx),
					rule: convert(nt, true)
				};
			});

			rules.unshift({
				name: "start",
				rule: convert(converted.ast, true)
			});

			return rules.map(function(r) {
				return r.name + " =\n\t" + r.rule;
			}).join("\n\n");
		}
	}
};

function r2p(regex, front, middle, opt, back) {
	front = front || parts.frontends.regex;
	middle = middle || parts.middleends.base;
	opt = opt || parts.optimizers.reduce;
	back = back || parts.backends.pegjs;

	return back(opt(middle(front(regex))));
}