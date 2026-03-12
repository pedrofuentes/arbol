import { OrgNode } from '../types';

export const SAMPLE_ORG: OrgNode = {
  id: 'ceo',
  name: 'Rowan Everhart',
  title: 'CEO',
  children: [
    { id: 'pal-ceo-1', name: 'Sage Calloway', title: 'Chief of Staff' },
    { id: 'pal-ceo-2', name: 'Wren Ashford', title: 'EA to CEO' },
    { id: 'pal-ceo-3', name: 'Quinn Morrigan', title: 'Strategy Advisor' },
    {
      id: 'cto',
      name: 'Cypress Aldridge',
      title: 'CTO',
      children: [
        { id: 'pal-cto-1', name: 'Fern Hollister', title: 'Tech Advisor' },
        { id: 'pal-cto-2', name: 'Lark Whitfield', title: 'EA to CTO' },
        {
          id: 'vp-eng',
          name: 'Ivy Thornton',
          title: 'VP Engineering',
          children: [
            {
              id: 'em-fe',
              name: 'Hazel Drummond',
              title: 'EM Frontend',
              children: [
                { id: 'fe-1', name: 'Aspen Kade', title: 'Sr Engineer' },
                { id: 'fe-2', name: 'Briar Lennox', title: 'Engineer' },
                { id: 'fe-3', name: 'Clover Merritt', title: 'Engineer' },
                { id: 'fe-4', name: 'Daphne Voss', title: 'Jr Engineer' },
              ],
            },
            {
              id: 'em-be',
              name: 'Cedar Blackwell',
              title: 'EM Backend',
              children: [
                { id: 'be-1', name: 'Elm Carver', title: 'Sr Engineer' },
                { id: 'be-2', name: 'Flora Beckett', title: 'Engineer' },
                { id: 'be-3', name: 'Glen Archer', title: 'Engineer' },
              ],
            },
            {
              id: 'em-qa',
              name: 'Juniper Hale',
              title: 'EM QA',
              children: [
                { id: 'qa-1', name: 'Laurel Vance', title: 'QA Lead' },
                { id: 'qa-2', name: 'Moss Fielding', title: 'QA Engineer' },
              ],
            },
          ],
        },
        {
          id: 'vp-plat',
          name: 'Oakley Pemberton',
          title: 'VP Platform',
          children: [
            { id: 'pal-plat-1', name: 'Rue Atwood', title: 'Platform Architect' },
            {
              id: 'em-infra',
              name: 'Birch Talmadge',
              title: 'EM Infra',
              children: [
                { id: 'infra-1', name: 'Aster Northcott', title: 'Sr SRE' },
                { id: 'infra-2', name: 'Brook Landry', title: 'SRE' },
                { id: 'infra-3', name: 'Coral Wingate', title: 'SRE' },
                { id: 'infra-4', name: 'Dale Prescott', title: 'Jr SRE' },
                { id: 'infra-5', name: 'Echo Fairbanks', title: 'Jr SRE' },
              ],
            },
            {
              id: 'em-data',
              name: 'Linden Graves',
              title: 'EM Data',
              children: [
                { id: 'data-1', name: 'Marigold Sinclair', title: 'Data Engineer' },
                { id: 'data-2', name: 'Nico Ashby', title: 'Data Engineer' },
              ],
            },
          ],
        },
        {
          id: 'dir-security',
          name: 'Willow Estrada',
          title: 'Dir Security',
          children: [
            {
              id: 'em-sec',
              name: 'Thorn Langley',
              title: 'EM AppSec',
              children: [
                { id: 'sec-1', name: 'Olive Castillo', title: 'Security Engineer' },
                { id: 'sec-2', name: 'Pike Donovan', title: 'Security Engineer' },
                { id: 'sec-3', name: 'Reed Ellison', title: 'Pentester' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'cfo',
      name: 'Maple Harrington',
      title: 'CFO',
      children: [
        { id: 'pal-cfo-1', name: 'Finch Wakefield', title: 'FP&A Analyst' },
        {
          id: 'ctrl',
          name: 'Alder Cromwell',
          title: 'Controller',
          children: [
            { id: 'acct-1', name: 'Poppy Whitmore', title: 'Sr Accountant' },
            { id: 'acct-2', name: 'Robin Caldwell', title: 'Accountant' },
          ],
        },
        {
          id: 'treas',
          name: 'Iris Fairchild',
          title: 'Treasurer',
          children: [{ id: 'fin-1', name: 'Sorrel Delacroix', title: 'Financial Analyst' }],
        },
      ],
    },
    {
      id: 'coo',
      name: 'Forrest Kincaid',
      title: 'COO',
      children: [
        {
          id: 'vp-ops',
          name: 'Sylvan Royce',
          title: 'VP Operations',
          children: [
            {
              id: 'em-logistics',
              name: 'Heath Barlow',
              title: 'EM Logistics',
              children: [
                { id: 'log-1', name: 'Basil Croft', title: 'Ops Coordinator' },
                { id: 'log-2', name: 'Calla Devlin', title: 'Ops Coordinator' },
                { id: 'log-3', name: 'Daisy Engstrom', title: 'Ops Specialist' },
                { id: 'log-4', name: 'Fox Gallagher', title: 'Ops Specialist' },
                { id: 'log-5', name: 'Gale Holloway', title: 'Ops Associate' },
                { id: 'log-6', name: 'Harbor Jarvis', title: 'Ops Associate' },
                { id: 'log-7', name: 'Indigo Kerr', title: 'Ops Intern' },
                { id: 'log-8', name: 'Jasper Locke', title: 'Ops Intern' },
              ],
            },
            {
              id: 'em-support',
              name: 'Piper Ainsworth',
              title: 'EM Support',
              children: [
                { id: 'sup-1', name: 'Skye Brennan', title: 'Support Lead' },
                { id: 'sup-2', name: 'Thistle Crane', title: 'Support Specialist' },
                { id: 'sup-3', name: 'Vale Dumont', title: 'Support Specialist' },
              ],
            },
          ],
        },
        {
          id: 'hr-mgr',
          name: 'Yarrow Pennington',
          title: 'HR Manager',
          children: [
            { id: 'hr-1', name: 'Zinnia Rowe', title: 'HR Specialist' },
            { id: 'hr-2', name: 'Acacia Sterling', title: 'Recruiter' },
            { id: 'hr-3', name: 'Briony Tate', title: 'Recruiter' },
          ],
        },
      ],
    },
    {
      id: 'cmo',
      name: 'Laurel Kingsley',
      title: 'CMO',
      children: [
        { id: 'pal-cmo-1', name: 'Orion Redmond', title: 'Brand Strategist' },
        { id: 'pal-cmo-2', name: 'River Chandler', title: 'Comms Lead' },
        {
          id: 'em-growth',
          name: 'Sienna Marchetti',
          title: 'Growth Lead',
          children: [
            { id: 'gr-1', name: 'Terra Novak', title: 'Growth Engineer' },
            { id: 'gr-2', name: 'Umber Yates', title: 'Growth Analyst' },
          ],
        },
        {
          id: 'em-design',
          name: 'Violet Ashworth',
          title: 'Design Lead',
          children: [
            { id: 'des-1', name: 'Wisteria Cole', title: 'Sr Designer' },
            { id: 'des-2', name: 'Zephyr Drake', title: 'Designer' },
            { id: 'des-3', name: 'Aurora Finley', title: 'Jr Designer' },
          ],
        },
      ],
    },
  ],
};
