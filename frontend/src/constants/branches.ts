export interface BranchOption {
  value: string;
  label: string;
}

export const BTECH_BRANCHES: BranchOption[] = [
  { value: 'CSE', label: 'Computer Science and Engineering (CSE)' },
  { value: 'CSE-AIML', label: 'Computer Science and Engineering (AI & ML)' },
  { value: 'AI-DS', label: 'Artificial Intelligence and Data Science (AI & DS)' },
  { value: 'IT', label: 'Information Technology (IT)' },
  { value: 'ECE', label: 'Electronics and Communication Engineering (ECE)' },
  { value: 'EEE', label: 'Electrical and Electronics Engineering (EEE)' },
  { value: 'ME', label: 'Mechanical Engineering (ME)' },
  { value: 'CE', label: 'Civil Engineering (CE)' },
  { value: 'CHE', label: 'Chemical Engineering' },
  { value: 'BT', label: 'Biotechnology' },
  { value: 'Other', label: 'Other' },
];

export interface YearOption {
  value: string;
  label: string;
}

export const BTECH_YEAR_OPTIONS: YearOption[] = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];
