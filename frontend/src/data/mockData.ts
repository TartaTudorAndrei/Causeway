export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  story: string;
  design: 'candle' | 'heart' | 'argyle' | 'forest';
  capacity: string;
  material: string;
  stock: number;
  featured: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: 'platinum' | 'gold' | 'silver';
  logoPlaceholder: string;
}

export interface ImpactMetric {
  value: string;
  label: string;
  description: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'item-alpha',
    name: 'Campaign Item Alpha',
    price: 45,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin accumsan, nisl eget scelerisque hendrerit, ante magna tristique nisl.',
    story: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.',
    design: 'candle',
    capacity: 'Standard',
    material: 'Lorem ipsum dolor sit amet',
    stock: 120,
    featured: true
  },
  {
    id: 'item-beta',
    name: 'Campaign Item Beta',
    price: 45,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin accumsan, nisl eget scelerisque hendrerit, ante magna tristique nisl.',
    story: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.',
    design: 'heart',
    capacity: 'Standard',
    material: 'Lorem ipsum dolor sit amet',
    stock: 85,
    featured: true
  },
  {
    id: 'item-gamma',
    name: 'Campaign Item Gamma',
    price: 50,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin accumsan, nisl eget scelerisque hendrerit, ante magna tristique nisl.',
    story: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.',
    design: 'argyle',
    capacity: 'Special Edition',
    material: 'Lorem ipsum dolor sit amet',
    stock: 150,
    featured: true
  },
  {
    id: 'item-delta',
    name: 'Campaign Item Delta',
    price: 45,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin accumsan, nisl eget scelerisque hendrerit, ante magna tristique nisl.',
    story: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.',
    design: 'forest',
    capacity: 'Standard',
    material: 'Lorem ipsum dolor sit amet',
    stock: 95,
    featured: false
  }
];

export const SPONSORS: Sponsor[] = [
  { id: '1', name: 'Lorem Sponsor A', tier: 'platinum', logoPlaceholder: 'Lorem Sponsor A' },
  { id: '2', name: 'Lorem Sponsor B', tier: 'platinum', logoPlaceholder: 'Lorem Sponsor B' },
  { id: '3', name: 'Lorem Sponsor C', tier: 'gold', logoPlaceholder: 'Lorem Sponsor C' },
  { id: '4', name: 'Lorem Sponsor D', tier: 'gold', logoPlaceholder: 'Lorem Sponsor D' },
  { id: '5', name: 'Lorem Sponsor E', tier: 'silver', logoPlaceholder: 'Lorem Sponsor E' },
  { id: '6', name: 'Lorem Sponsor F', tier: 'silver', logoPlaceholder: 'Lorem Sponsor F' }
];

export const IMPACT_METRICS: ImpactMetric[] = [
  {
    value: '15,000+',
    label: 'Lorem Ipsum',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
  },
  {
    value: '4,500',
    label: 'Lorem Ipsum',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
  },
  {
    value: '180,000',
    label: 'Lorem Ipsum',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
  },
  {
    value: '12',
    label: 'Lorem Ipsum',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
  }
];

export const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
    answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Pellentesque in ipsum id orci porta dapibus. Curabitur aliquet quam id dui posuere blandit.'
  },
  {
    id: 'faq-2',
    question: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
    answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Pellentesque in ipsum id orci porta dapibus. Curabitur aliquet quam id dui posuere blandit.'
  },
  {
    id: 'faq-3',
    question: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
    answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Pellentesque in ipsum id orci porta dapibus. Curabitur aliquet quam id dui posuere blandit.'
  },
  {
    id: 'faq-4',
    question: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
    answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Pellentesque in ipsum id orci porta dapibus. Curabitur aliquet quam id dui posuere blandit.'
  },
  {
    id: 'faq-5',
    question: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit?',
    answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Pellentesque in ipsum id orci porta dapibus. Curabitur aliquet quam id dui posuere blandit.'
  }
];
