import type { PaperGraph } from '../types/graph'

// sample data for building the UI before extraction exists.
// The paper is dummy data. It covers every case the view must handle:
// - evidence linked to two claims (e3)
// - a claim linked to another claim (c2 -> c1)
// - contradicting evidence (e6)
// - evidence with no links (e8)
export const sampleGraph: PaperGraph = {
  title: 'Sleep Duration and Memory Consolidation in Undergraduate Students',
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
  ],
}
