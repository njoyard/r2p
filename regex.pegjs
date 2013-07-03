start
	= disjunction

reserved
	= [\[\\\^\$\.\|\?\*\+\(\)]

charLiteral
	= ("\\" / !reserved) c:.
	{ return { type: "char", content: c }; }

anyChar
	= "."
	{ return { type: "anyChar" }; }

charClass
	= "[" inverted:("^")?  body:(classRange / classLiteral)* "]"
	{ return { type: "set", inverted: inverted, content: body }; }

classChar
	=  ("\\" / ![-\]\\]) c:.
	{ return c; }

classLiteral
	= c:classChar
	{ return c; }

classRange
	= start:classChar "-" end:classChar
	{ return start + "-" + end; }


disjunction
	= a:concatenation "|" b:disjunction { return { type: "disjunction", left: a, right: b }; }
	/ concatenation

concatenation
	= a:kleene b:concatenation { return { type: "concatenation", left: a, right: b }; }
	/ kleene

kleene
	= a:atom "*" { return { type: "repeat", content: a }; }
	/ a:atom "+" { return { type: "concatenation", left: a, right: { type: "repeat", content: a } }; }
	/ atom

atom
	= anyChar
	/ charLiteral
	/ charClass
	/ "(" s:start ")" { return s; }