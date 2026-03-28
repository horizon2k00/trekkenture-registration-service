export interface StudentDetails {
  fullName: string;
  initialsName: string;
  age: number | '';
  dob: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  section: string;
  medicalConditions: string;
  email: string;
  mobile: string;
}

export interface ParentDetails {
  primaryName: string;
  primaryEmail: string;
  primaryMobile: string;
  secondaryName: string;
  secondaryEmail: string;
  secondaryMobile: string;
}

export interface FormData {
  student: StudentDetails;
  parent: ParentDetails;
  agreedToTerms: boolean;
  paymentUtr: string;
}

export type FormErrors = {
  [key: string]: string;
};