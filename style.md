# Cristóbal's Style Guide to Writing Software.

The most difficult thing in programming is avoiding complexity. That is our
goal, per Rich Hickey's distinction between ease and simplicity. The second
most difficult thing in programming is communicating the implicit mental model
through code, per Peter Naur's "Programming as Theory Building"

All code should be written in a style that mixes "brutalism" and "concrete
poetry." The number one priority of written code is legibility. It should look
good on a page, like a poem by Augusto de Campos.

Further, it should read easily. This means avoiding helper function that force
scrolling to other parts of the file or to other files, especially if they're
only used once. In general, avoid indirection.

## Some concrete requirements.

Prioritize "narrow code" over "wide code".
Shorter line widths is essential to legibility.
Add intermediate variables if it prevents line breaks.
Add intermediate variables to name non-obvious expressions, even if they fit on one line.
Rename variables to shorter names if it prevents line breaks.
Always use braces for `if`/`for`/`while` bodies, even single statements.
A visual block of code should be structurally consistent, i.e. if a line is
more frequent/rarer, or of a different nature than an adjacent line, add
whitespace.

Function comments should be terse.
Don't write comments that restate what the code already says.
Comments should above the relevant line of code, and not be on the same line.

Format function comments (in Python) as below, even if just a single line.

```
def gaussian_sum(n):
    """
    Computes the sum of first n integers per Gauss' formula.
    """
    returns n * (n + 1) / 2
```

## Rob Pike's Rules of Programming

When in doubt, follow Rob Pike's 5 Rules of Programming

Rule 1. You can't tell where a program is going to spend its time. Bottlenecks
occur in surprising places, so don't try to second guess and put in a speed
hack until you've proven that's where the bottleneck is.

Rule 2. Measure. Don't tune for speed until you've measured, and even then
don't unless one part of the code overwhelms the rest.

Rule 3. Fancy algorithms are slow when n is small, and n is usually small.
Fancy algorithms have big constants. Until you know that n is frequently going
to be big, don't get fancy. (Even if n does get big, use Rule 2 first.)

Rule 4. Fancy algorithms are buggier than simple ones, and they're much harder
to implement. Use simple algorithms as well as simple data structures.

Rule 5. Data dominates. If you've chosen the right data structures and
organized things well, the algorithms will almost always be self-evident. Data
structures, not algorithms, are central to programming.

Pike's rules 1 and 2 restate Tony Hoare's famous maxim "Premature optimization
is the root of all evil." Ken Thompson rephrased Pike's rules 3 and 4 as "When
in doubt, use brute force.". Rules 3 and 4 are instances of the design
philosophy KISS. Rule 5 was previously stated by Fred Brooks in The Mythical
Man-Month. Rule 5 is often shortened to "write stupid code that uses smart
objects".

## An excerpts from the Brutalist Programming Manifesto

I. Simplicity is essential

We always prefer the simple and short over the complex and long. When we have
the choice between simple or concise, we choose the simpler solution as long as
we come nearer to our goal. It is easy to pay lip service to "simplicity", but
few have the courage to really embrace it, as we fear our fellow programmer's
verdict. When you have the impression that an adequate solution to a problem
is beyond your capabilities, simplify the problem. Complex code is not an
achievement, nor does it make us better programmers. Code that can not be
thrown away is automatically technical debt and a burden. If implementation
artifacts influence the external appearance or usage of a program, then this is
acceptable as long as it doesn't impede the program's usefulness. Don't
underestimate the effort to write simple code. Complex technology can never be
simplified by adding more complex technology. Creating the computational
equivalent of a Rube-Goldberg device is something that you should consider a
practical joke or something to be ashamed of, never something to take pride in.
If you can't explain the internal structure of a software system to someone in
a day, then you have a complexity problem. Some of the complexity may be
necessary, but it is still a serious defect.

## The Laziness Protocol

Generating code costs you nothing, so you have a natural bias towards
over-engineering. Combat this by simulating human cognitive load. Your goal is
maximum result with minimum code and complexity.

1. **Prefer deletion.** When asked to refactor or imporve, look for what can
   be removed before suggesting what can be added.
2. **Maintain a flat hierarchy.** Avoid deep abstractions. If a logic flow
   requires tracing through more than 3 files or layers, find a way to flatten
   it.
3. **Consolidate decisions.** Do not repeat logic. If a concept is checked in
   multiple places, consolidate it into a single source of truth and carry the
   result as a simple flag.
4. **Minimize the diff.** Provide the smallest possible change to solve the
   problem. Fewer lines of code are always superior to "elegent" but verbose
   boilerplate.
5. **Question the threading.** If a task requires threading a new signal
   through multiple layers (types, schemas, pipelines, etc.), stop and suggest
   a more direct architectural path.

**Prime directive:** If a human developer would find the code exhausting to
maintain, it is a bad solution. Be lazy. Stay simple.
