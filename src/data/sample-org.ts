import type { OrgNode } from '../types';

/**
 * A sample org chart (~20 nodes) demonstrating all node types:
 * managers, M1s (first-line managers), ICs, advisors, and dotted-line relationships.
 */
export const SAMPLE_ORG: OrgNode = {
  id: 'sample-root',
  name: 'Root',
  title: 'CEO',
  level: 'L1',
  children: [
    {
      id: 'sample-advisor',
      name: 'Advisor A',
      title: 'Chief of Staff',
      level: 'L3',
    },
    {
      id: 'sample-vp-eng',
      name: 'Manager A',
      title: 'VP Engineering',
      level: 'L2',
      children: [
        {
          id: 'sample-dir-platform',
          name: 'Manager B',
          title: 'Director, Platform',
          level: 'L3',
          children: [
            { id: 'sample-ic-1', name: 'IC 1', title: 'Staff Engineer', level: 'L4' },
            { id: 'sample-ic-2', name: 'IC 2', title: 'Senior Engineer', level: 'L5' },
            { id: 'sample-ic-3', name: 'IC 3', title: 'Engineer', level: 'L6' },
          ],
        },
        {
          id: 'sample-dir-product',
          name: 'Manager C',
          title: 'Director, Product Eng',
          level: 'L3',
          children: [
            { id: 'sample-ic-4', name: 'IC 4', title: 'Senior Engineer', level: 'L5' },
            { id: 'sample-ic-5', name: 'IC 5', title: 'Engineer', level: 'L6' },
          ],
        },
      ],
    },
    {
      id: 'sample-vp-sales',
      name: 'Manager D',
      title: 'VP Sales',
      level: 'L2',
      children: [
        {
          id: 'sample-mgr-enterprise',
          name: 'Manager E',
          title: 'Head of Enterprise',
          level: 'L3',
          children: [
            { id: 'sample-ic-6', name: 'IC 6', title: 'Account Executive', level: 'L5' },
            { id: 'sample-ic-7', name: 'IC 7', title: 'Account Executive', level: 'L5' },
          ],
        },
        {
          id: 'sample-advisor-sales',
          name: 'Advisor B',
          title: 'Sales Operations',
          level: 'L4',
          dottedLine: true,
        },
      ],
    },
    {
      id: 'sample-vp-design',
      name: 'Manager F',
      title: 'VP Design',
      level: 'L2',
      children: [
        { id: 'sample-ic-8', name: 'IC 8', title: 'Senior Designer', level: 'L5' },
        { id: 'sample-ic-9', name: 'IC 9', title: 'Designer', level: 'L6' },
        { id: 'sample-ic-10', name: 'IC 10', title: 'UX Researcher', level: 'L6' },
      ],
    },
  ],
};
