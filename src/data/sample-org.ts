import type { OrgNode } from '../types';

/**
 * A sample org chart (~20 nodes) demonstrating all node types:
 * managers, M1s (first-line managers), ICs, advisors, and dotted-line relationships.
 */
export const SAMPLE_ORG: OrgNode = {
  id: 'sample-root',
  name: 'Root',
  title: 'CEO',
  children: [
    {
      id: 'sample-advisor',
      name: 'Advisor A',
      title: 'Chief of Staff',
    },
    {
      id: 'sample-vp-eng',
      name: 'Manager A',
      title: 'VP Engineering',
      children: [
        {
          id: 'sample-dir-platform',
          name: 'Manager B',
          title: 'Director, Platform',
          children: [
            { id: 'sample-ic-1', name: 'IC 1', title: 'Staff Engineer' },
            { id: 'sample-ic-2', name: 'IC 2', title: 'Senior Engineer' },
            { id: 'sample-ic-3', name: 'IC 3', title: 'Engineer' },
          ],
        },
        {
          id: 'sample-dir-product',
          name: 'Manager C',
          title: 'Director, Product Eng',
          children: [
            { id: 'sample-ic-4', name: 'IC 4', title: 'Senior Engineer' },
            { id: 'sample-ic-5', name: 'IC 5', title: 'Engineer' },
          ],
        },
      ],
    },
    {
      id: 'sample-vp-sales',
      name: 'Manager D',
      title: 'VP Sales',
      children: [
        {
          id: 'sample-mgr-enterprise',
          name: 'Manager E',
          title: 'Head of Enterprise',
          children: [
            { id: 'sample-ic-6', name: 'IC 6', title: 'Account Executive' },
            { id: 'sample-ic-7', name: 'IC 7', title: 'Account Executive' },
          ],
        },
        {
          id: 'sample-advisor-sales',
          name: 'Advisor B',
          title: 'Sales Operations',
          dottedLine: true,
        },
      ],
    },
    {
      id: 'sample-vp-design',
      name: 'Manager F',
      title: 'VP Design',
      children: [
        { id: 'sample-ic-8', name: 'IC 8', title: 'Senior Designer' },
        { id: 'sample-ic-9', name: 'IC 9', title: 'Designer' },
        { id: 'sample-ic-10', name: 'IC 10', title: 'UX Researcher' },
      ],
    },
  ],
};
