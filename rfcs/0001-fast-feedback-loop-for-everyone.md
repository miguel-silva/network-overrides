# fast feedback loop for everyone

<!-- 
- [fast feedback loop for everyone](#fast-feedback-loop-for-everyone)
	- [Status](#status)
	- [Owner](#owner)
	- [Reviewers](#reviewers)
	- [Summary](#summary)
					- [[1] "directly" is a simplification, see proposed solution for implementation details.](#1-directly-is-a-simplification-see-proposed-solution-for-implementation-details)
	- [Context](#context)
		- [Current status:](#current-status)
		- [Change driver:](#change-driver)
		- [Constraints:](#constraints)
	- [Proposal](#proposal)
		- [The key selling point](#the-key-selling-point)
		- [Additional benefits](#additional-benefits)
	- [Roadmap](#roadmap)
	- [Alternatives](#alternatives)
	- [Appendix A](#appendix-a)
	- [Appendix B - the value of developing in production](#appendix-b---the-value-of-developing-in-production)
	- [Appendix C - why `x-build/` for branch prefixes](#appendix-c---why-x-build-for-branch-prefixes)
-->

## Status

DRAFT
<!-- DRAFT / UNDER REVIEW / ACCEPTED -->

## Owner

Kipras Melnikovas [@kiprasmel](http://github.com/kiprasmel)
<!-- Name and @github username -->

## Reviewers
<!--
  Each RFC should have one or more reviewers that should provide feedback and validate the idea. All participants should agree on the final proposal, changing the status of their review to ACCEPTED.

  - <name> @github - UNDER REVIEW / ACCEPTED
  - <name> @github - UNDER REVIEW / ACCEPTED
-->
- Miguel Silva [@miguel-silva](http://github.com/miguel-silva) - UNDER REVIEW
-

## Summary
<!-- Brief description of the topic, what are we trying to address and what is the goal.  -->

<!-- We want to ship fast & break things. In this document, we'll focus on an idea to improve the 1st, while reducing the amount of the 2nd. -->

We want to improve the process of reviewing UI changes, especially for non-engineers.

Instead of the current approach to either:
- a) spin up a testbox (k8s cluster with various services), or
- b) deploy to production & only then get reviews from non-engineers,

we propose a new solution -- to improve the `network-overrides` extension by allowing it to load changed code directly [[1](#1-directly-is-a-simplification-see-proposed-solution-for-implementation-details)] from github PRs, instead of from a local dev-server, so that non-engineers can use it to view the changes live in production the same way engineers do, but without the hassle of setting up a local dev environment.

###### [1] "directly" is a simplification, see proposed solution for implementation details.

## Context


### Current status:
<!-- Describe current status: how things work right now. -->

### Change driver:
<!-- Change driver: what fact triggered actions leading you to create this RFC proposal. -->

### Constraints:
<!--
  Include constraints: What are dependencies and limitations? Do we need to change something because it was deprecated? Are we constrained in decisions by existing solutions or the environment? Examples:

  - Library XY was deprecated and is no longer maintained.
  - We used this approach for a long time but there is now a better XY alternative on which the community largely agrees and we wouldn’t hire anyone in 2 years without it.

  Tip: Support your claims with relevant links, provide charts to illustrate the current architecture, etc.
-->


## Proposal
<!-- Description of the proposed solution. What people should do now and how or how things will work after the change. -->

Core idea:

1. allow `network-overrides` to load overwritten scripts from github too, instead of only localhost.
2. create a reusable github action that will build the project and push the `build` output into github as a separate branch. would work like this:
	1. dev creates a new branch `implement-feature-a`
	2. action creates a new branch `x-build/implement-feature-a`, builds the project from `implement-feature-a`, pushes the `build` output to the `x-build/implement-feature-a` branch
	3. on new pushes to `implement-feature-a`, action re-builds & updates `x-build/implement-feature-a`.
3. make `network-overrides` extension inject a button into github's PR pages UI to "Load override"
4. upon navigating to the application, if local dev-server of network-overrides is not running, automatically load the override which got selected from the github PR's UI.
   1. needs separate indicator
   2. if both dev-server & recently github-loaded override is available, make user select which one to use

this way, we get rid of the local `dev-server` step.

### The key selling point

- for devs, this is a speedup, but quite a small one.
- for non-devs, however, this is huge!
	-  normally, PMs, designers & others would need to setup a whole dev environment (installing git & other dependencies, cloning the project, checking out the relevant branch, running the local dev server).
		- we completely eliminate this requirement! the only prerequisite is a github account - to be able to load assets from http://raw.githubusercontent.com/, because the repos are often private. that's all!

### Additional benefits

1. more people get  exposed to a deeper technical level -- the code

? get exposed to the technical process of writing code

not that designers, PMs et al need to code, but simply having access is a great first step. it allows observing the actual process of writing code, performing reviews & shipping to production. if one's curious - they can look at the code changes - maybe out of curiosity, which could potentially even lead to a career change, or maybe to better understand the complexity & why some things cannot "just" be done & need more effort. all of this is optional, but it opens up a door to understand better & become more technical.

not to mention, some designers in PD are already using github just fine!

2. improved review speed - faster feedback loop

instead of either:

a) spinning up a testbox, waiting for the services to deploy & having non-devs test the changes (which are also in a non-prod environment, so different data than the normal testing company), or 

b) deploying the changes to production, and only then the non-devs trying out the changes, and if problems are found - having to do follow-up PRs & deployments,

we can have our cake and eat it too:

c) write the code, mark as "ready for review" as usual. now both devs & non-devs can perform reviews w/ 0 additional effort from anyone. then, when shipping to prod, everything's already done - no need to do reactionary fixups w/ extra PRs. speed ✅. less breakages ✅. no extra friction ✅.

2.1 

additionally to A, re-deploying changes in the testbox needs to be done manually every time (clicking to rebuild the service), & the rebuilding itself is longer than that of simply building the static assets.

in C - this is automatic, way faster, and we could even have an indicator in the `network-overrides` extension that informs about new available changes, and allows to load them.

3. lower cost

spinning up a whole k8s cluster w/ a bunch of services is not only (relatively) slow, but also expensive. and for frontend changes, it's not needed!

let's make the resources more available to those who actually need them.


<!-- ### Pros:

### Cons: -->

## Roadmap
<!--
  Is the change bigger or should be implemented in more steps? Provide a roadmap that will bring people to the proposed end goal, split the work into multiple stages, prioritize the steps. Adoption strategy among the company.
-->

1. figure out if it's possible to load assets from http://raw.githubusercontent.com/ without a github API token
	- from github's UI, when clicking on a PR, then some file, then "view file", then "raw", it opens the URL with a `?token=XXX` param. maybe it's possible to get this token when clicking the "Load override" in the PR.
	- if not, then
		- [ ] extend `network-overrides` extension popup to accept github's API token
		- [ ] document the steps needed to perform to generate this token
		- [ ] when trying to load the overrides, if the token is missing, inform the user
		- note: i'd highly prefer using github as the file CDN, instead of doing some local proxy, because for github, a single SAML authentication covers all needs. meanwhile, for a proxy, we'd need to force the user to additionally connect to the VPN, which is unnecessary friction i'd really prefer to avoid.
			- since these are FE assets, they're public anyway, so we could make the access public. but, security will never allow this.

2. implement the steps described in the proposal & make sure everything works

3. onboard some non-devs to this process, make sure everything's smooth

4. announce in PD & recommend this approach

## Alternatives
<!-- Are there any alternative ways to achieve the same or similar outcome? Why we decided to sweep them under the carpet. -->

## Appendix A
<!-- ( - how we got here?) (or move to "Context"?) -->

Originally in AM we had a meeting to discuss the process of reviewing frontend PRs.
First suggestion was that we enforce a mandatory review step from design, i.e. each pull request would need to be deployed to a testbox & would need approval from our designer before we can ship it.

We weren't big fans of this because it'd slow down the "ship fast" aspect / time from idea to production. The more friction there is, the less it is motivating to work on the project, and here - having to deal with testboxes (when we don't need them) + extra process for approvals - both would've introduced unnecessary friction.

Not to mention that we FE engineers review the PR thoroughly ourselves - we don't only look at the code - we checkout it locally, swiftly run it in production thanks to harrier's dockerless mode, and poke around in the application.
So the only thing that the mandatory review step from design would catch would be minor, low prio bugs, because anything bigger we would've been just as likely to catch ourselves, thus the extra process proves to be even less useful.

Thus, we agreed to instead ...


But then, quite quickly we noticed that (this could be improved? / the feedback loop could be faster) ...


Originally idea came to mind from this thread in AM:
- https://pipedrive.slack.com/archives/C03AACGTNBU/p1658828578561089

to summarize the thread:

...

and none of this would've been necessary - we could've made the simple fix in the same PR, _if only_ there was a way for the designer to review the changes before shipping them to production. Boom, idea.


## Appendix B - the value of developing in production

- no need to create dummy data everytime:
  - less friction for both the author, and all reviewers too
  - easier to catch weird cases, because more variety in existing data

- in general less friction
  - account already logged in
  - no different links to access company
  - no need to worry about the testbox expiring

...

## Appendix C - why `x-build/` for branch prefixes

- ordering - both in github's UI, and w/ `git branch [-a]` - the branch names will be bloat, so at least we can make them appear in the very end of the list by prefixing w/ a char that's in the end of the alphabet.
	- the `build` part is self-explanatory i think
	- [ ] we can consider additional options, such as periodically removing old `x-build/` branches. though, there is value in 

...
