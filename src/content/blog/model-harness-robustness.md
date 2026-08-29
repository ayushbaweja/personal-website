---
title: "Model Harness Robustness"
subtitle: "Challenging the scaffolding tax"
published: 2026-08-16T12:00:00-05:00
draft: true
---

My friend [Arnav](https://arnavmardia.com/#about) works at [Neosigma](https://neosigma.ai/) and recently sent me one of their blog posts describing the ["scaffolding tax"](https://neosigma.ai/blog/investigating-the-optimal-harness-for-a-model). The post defines the scaffolding tax as the suppresion of capability that can happen if a harness is not optimized for a particular model or usecase. 

In their exploration, they come across an interesting result: when GPT-5.6 Sol is used on a Terminal-Bench 2.0 tasks using the open-source harness Pi, it performs worse on average compared to the same harness using a less intelligent model.

<figure>
  <img src= "/Users/ayushbaweja/Development/personal-website/public/images/blog/model-harness-robustness/neosigma-graph.png">
</figure>

This felt counterintuitive to me. *If a model is generally more intelligent, shouldn't it deal with ambiguity, contradiction or even more specific detail better than a smaller or less capable model?* I decided to run my own experiment and see if the performance drop off was really causal evidence of a model-harness unoptimization.

## Hypothesis

Let

- \(M_o\) denote the older, less capable model.
- \(M_n\) denote the newer, more capable model.
- \(H_0\) denote the stock Pi harness.
- \(H_o\) denote an over-scaffolded Pi configuration designed or tuned for \(M_o\).
- \(S(M,H)\) denote the expected score of model \(M\) using harness \(H\) on a fixed task, averaged over repeated trials.

My hypothesis is that increasing model capability should not reduce performance under either harness:

\[
S(M_n,H_0) \geq S(M_o,H_0)
\]

and

\[
S(M_n,H_o) \geq S(M_o,H_o).
\]

In other words, the more capable model should perform at least as well under stock Pi and should also be at least as capable of handling scaffolding designed for the older model.

Define the model-capability gain under each harness as

\[
\Delta_0 = S(M_n,H_0)-S(M_o,H_0)
\]

and

\[
\Delta_o = S(M_n,H_o)-S(M_o,H_o).
\]

The model–harness interaction is then

\[
I = \Delta_o-\Delta_0.
\]

Equivalently,

\[
I =
\left[S(M_n,H_o)-S(M_o,H_o)\right]
-
\left[S(M_n,H_0)-S(M_o,H_0)\right].
\]

A negative interaction,

\[
I<0,
\]

means that the older-model scaffolding reduces the newer model’s capability advantage.

If we want the scaffolding tax to be expressed as a positive loss, define

\[
\tau = -I = \Delta_0-\Delta_o.
\]

Therefore,

\[
\tau =
\left[S(M_n,H_0)-S(M_o,H_0)\right]
-
\left[S(M_n,H_o)-S(M_o,H_o)\right].
\]

Evidence of a scaffolding tax corresponds to

\[
\tau>0.
\]

Importantly, a positive tax does not necessarily contradict my monotonicity hypothesis. The newer model may retain an advantage under the over-scaffolded harness, but a smaller one:

\[
0 \leq \Delta_o < \Delta_0.
\]

The strongest challenge to my hypothesis would be a rank reversal:

\[
\Delta_0 \geq 0
\qquad\text{and}\qquad
\Delta_o < 0.
\]

That would mean the newer model performs at least as well under stock Pi but becomes worse than the older model when both use scaffolding tuned for the older model.


optimal harness vs non-optimal harness
experiment tests on a fixed harness
pi improves over codex same model