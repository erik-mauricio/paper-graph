// A made-up paper's graph for developing without the API (open /?sample).
// Also used by unit and e2e tests.
import type { PaperGraph } from '@shared/graph'

// sample data for building the UI before extraction exists.
// The paper is dummy data. It covers every case the view must handle:
// - evidence linked to two claims (e3)
// - a claim linked to another claim (c2 -> c1)
// - contradicting evidence (e6)
// - evidence with no links (e8)
// - methods linked to the results they produced (m1-m3), and a study design overview
export const sampleGraph: PaperGraph = {
  title: 'Sleep Duration and Memory Consolidation in Undergraduate Students',
  context: {
    summary:
      'The authors tracked how long 120 undergraduates slept and tested their memory each morning. ' +
      'Students who slept longer, and especially those who got more deep sleep, remembered more; a short nap did not make up for lost sleep.',
    background: [
      {
        text: 'Many students cut sleep to study, but it is unclear how much this hurts memory for what they just learned.',
        source: {
          page: 1,
          quote: 'Undergraduates routinely trade sleep for study time, yet the cost of this trade for newly learned material is poorly understood.',
        },
      },
      {
        text: 'Lab studies link deep sleep to memory, but few have looked at students sleeping at home over several weeks.',
        source: {
          page: 2,
          quote: 'Most evidence linking slow-wave sleep to memory comes from single nights in the laboratory.',
        },
      },
    ],
    study: {
      kind: 'observational',
      question: {
        text: 'Does sleeping longer improve next-day recall, and can a short nap replace a full night?',
        source: {
          page: 2,
          quote: 'We asked whether natural variation in sleep predicts next-day recall, and whether a brief nap can substitute for nocturnal sleep.',
        },
      },
      design: [
        {
          text: 'A three-week field study with sleep trackers, plus a one-day lab study comparing a nap to no sleep and to a full night.',
          source: {
            page: 3,
            quote: 'The study combined a three-week field phase with a single-day laboratory nap comparison.',
          },
        },
      ],
      participants: [
        {
          text: '120 undergraduates, mostly in their first or second year.',
          source: {
            page: 3,
            quote: 'One hundred and twenty undergraduates took part in the field phase.',
          },
        },
      ],
      groups: [
        {
          name: 'No sleep',
          role: 'control',
          description: 'Stayed awake in the lab between learning the words and the recall test.',
          source: { page: 7, quote: 'Control participants remained awake under supervision between learning and test.' },
        },
        {
          name: '30-minute nap',
          role: 'treatment',
          description: 'Took a 30-minute nap in the lab between learning and the test.',
          source: { page: 7, quote: 'Nap participants were given a 30-minute sleep opportunity after learning.' },
        },
        {
          name: 'Full night',
          role: 'comparison',
          description: 'Learned the words in the evening and slept at home overnight before the test.',
          source: { page: 7, quote: 'A third group learned in the evening and was tested after a full night of sleep at home.' },
        },
      ],
      measures: [
        {
          text: 'Number of word pairs recalled the next day on a paired-associate task.',
          source: { page: 3, quote: 'Recall was tested with a standard paired-associate word task.' },
        },
        {
          text: 'Total sleep and slow-wave sleep time, from wrist-worn trackers.',
          source: { page: 3, quote: 'Sleep duration and sleep stages were estimated from wrist-worn trackers.' },
        },
      ],
    },
  },
  nodes: [
    {
      id: 'c1',
      type: 'claim',
      text: 'Longer sleep improves next-day recall of newly learned material.',
      source: {
        page: 1,
        quote:
          'We find that students who slept longer recalled significantly more of the material learned the previous day.',
      },
    },
    {
      id: 'c2',
      type: 'claim',
      text: 'Deep (slow-wave) sleep drives most of the recall benefit.',
      source: {
        page: 6,
        quote:
          'The recall advantage was explained largely by time spent in slow-wave sleep rather than total sleep time.',
      },
    },
    {
      id: 'c3',
      type: 'claim',
      text: 'Short naps cannot replace a full night of sleep for memory.',
      source: {
        page: 8,
        quote:
          'A 30-minute nap did not produce recall comparable to a full night of sleep.',
      },
    },
    {
      id: 'c4',
      type: 'claim',
      text: 'The effect holds regardless of caffeine use.',
      source: {
        page: 9,
        quote:
          'Controlling for daily caffeine intake did not change the relationship between sleep and recall.',
      },
    },
    {
      id: 'e1',
      type: 'evidence',
      text: 'Participants sleeping 8+ hours recalled 23% more word pairs than those sleeping under 6 hours.',
      source: {
        page: 4,
        quote:
          'Participants in the long-sleep group recalled 23% more word pairs than the short-sleep group (p < 0.01).',
      },
    },
    {
      id: 'e2',
      type: 'evidence',
      text: 'Sleep tracker data from 120 students over 3 weeks.',
      source: {
        page: 3,
        quote:
          'We collected wrist-worn sleep tracker data from 120 undergraduate students over a three-week period.',
      },
    },
    {
      id: 'e3',
      type: 'evidence',
      text: 'Slow-wave sleep minutes correlated with recall scores (r = 0.61).',
      source: {
        page: 6,
        quote:
          'Minutes of slow-wave sleep were strongly correlated with recall scores (r = 0.61).',
      },
    },
    {
      id: 'e4',
      type: 'evidence',
      text: 'Nap group scored the same as the no-sleep control group.',
      source: {
        page: 8,
        quote:
          'Recall in the nap condition was statistically indistinguishable from the no-sleep control.',
      },
    },
    {
      id: 'e5',
      type: 'evidence',
      text: 'Regression including caffeine as a covariate kept the sleep effect significant.',
      source: {
        page: 9,
        quote:
          'With caffeine included as a covariate, sleep duration remained a significant predictor of recall.',
      },
    },
    {
      id: 'e6',
      type: 'evidence',
      text: 'Heavy caffeine users (4+ cups/day) showed a weaker sleep effect.',
      source: {
        page: 10,
        quote:
          'Among participants consuming four or more cups of coffee per day, the effect of sleep on recall was notably weaker.',
      },
    },
    {
      id: 'e7',
      type: 'evidence',
      text: 'Recall was tested with a standard paired-associate word task.',
      source: {
        page: 3,
        quote:
          'Memory was assessed using a standard paired-associate word learning task.',
      },
    },
    {
      id: 'e8',
      type: 'evidence',
      text: 'Most participants were in their first or second year of study.',
      source: {
        page: 3,
        quote:
          'The majority of participants were first- or second-year undergraduates.',
      },
    },
    {
      id: 'm1',
      type: 'method',
      text: 'Students wore sleep trackers for three weeks and took a recall test every morning.',
      source: {
        page: 3,
        quote: 'Sleep duration and sleep stages were estimated from wrist-worn trackers.',
      },
    },
    {
      id: 'm2',
      type: 'method',
      text: 'Lab study: a 30-minute nap group compared with a no-sleep control and a full-night group.',
      source: {
        page: 7,
        quote: 'Nap participants were given a 30-minute sleep opportunity after learning.',
      },
    },
    {
      id: 'm3',
      type: 'method',
      text: 'Caffeine intake was logged daily and added to the analysis as a covariate.',
      source: {
        page: 9,
        quote: 'Daily caffeine intake was self-reported and entered as a covariate.',
      },
    },
  ],
  edges: [
    { id: 'l1', from: 'e1', to: 'c1', relation: 'supports' },
    { id: 'l2', from: 'e2', to: 'c1', relation: 'supports' },
    { id: 'l3', from: 'e7', to: 'c1', relation: 'supports' },
    { id: 'l4', from: 'c2', to: 'c1', relation: 'supports' },
    { id: 'l5', from: 'e3', to: 'c2', relation: 'supports' },
    { id: 'l6', from: 'e3', to: 'c3', relation: 'supports' },
    { id: 'l7', from: 'e4', to: 'c3', relation: 'supports' },
    { id: 'l8', from: 'e5', to: 'c4', relation: 'supports' },
    { id: 'l9', from: 'e6', to: 'c4', relation: 'contradicts' },
    { id: 'l10', from: 'm1', to: 'e1', relation: 'supports' },
    { id: 'l11', from: 'm1', to: 'e3', relation: 'supports' },
    { id: 'l12', from: 'm2', to: 'e4', relation: 'supports' },
    { id: 'l13', from: 'm3', to: 'e5', relation: 'supports' },
  ],
}
