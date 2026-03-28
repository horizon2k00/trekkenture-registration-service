import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FormData, FormErrors } from '../../types';
import { Send, CheckCircle, Download } from 'lucide-react';
import { TermsSection } from './sections/TermsSection';
import { StudentSection } from './sections/StudentSection';
import { ParentSection } from './sections/ParentSection';
import { PaymentSection } from './sections/PaymentSection';

export const TrekkentureForm: React.FC = () => {
  const { tripName } = useParams<{ tripName: string }>();
  
  const [formData, setFormData] = useState<FormData>({
    student: {
      fullName: '',
      initialsName: '',
      age: '',
      dob: '',
      gender: '',
      section: '',
      medicalConditions: '',
      email: '',
      mobile: ''
    },
    parent: {
      primaryName: '',
      primaryEmail: '',
      primaryMobile: '',
      secondaryName: '',
      secondaryEmail: '',
      secondaryMobile: ''
    },
    agreedToTerms: false,
    paymentUtr: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Centralized validation logic
  const getValidationErrors = (data: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    const { student, parent, agreedToTerms, paymentUtr } = data;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/; // Simple 10 digit validation
    const cleanPhone = (p: string) => p.replace(/\D/g, '');

    // 1. Terms Validation
    if (!agreedToTerms) newErrors['agreedToTerms'] = 'You must agree to the terms to proceed';

    // 2. Student Validation
    if (!student.fullName.trim()) newErrors['student.fullName'] = 'Full name is required';
    if (!student.initialsName.trim()) newErrors['student.initialsName'] = 'Name with initials is required';
    
    if (!student.age) {
      newErrors['student.age'] = 'Age is required';
    } else if (Number(student.age) < 5 || Number(student.age) > 25) {
      newErrors['student.age'] = 'Age must be 5-25';
    }

    if (!student.dob) newErrors['student.dob'] = 'Date of birth is required';
    if (!student.gender) newErrors['student.gender'] = 'Gender selection is required';
    if (!student.section) newErrors['student.section'] = 'Section is required';
    
    if (!student.email) {
      newErrors['student.email'] = 'Email is required';
    } else if (!emailRegex.test(student.email)) {
      newErrors['student.email'] = 'Invalid email format';
    }

    if (!student.mobile) {
      newErrors['student.mobile'] = 'Mobile is required';
    } else if (!phoneRegex.test(cleanPhone(student.mobile))) {
      newErrors['student.mobile'] = 'Enter valid 10-digit number';
    }

    if (!student.medicalConditions.trim()) newErrors['student.medicalConditions'] = 'Required (enter "None" if applicable)';

    // 3. Parent Validation
    if (!parent.primaryName.trim()) newErrors['parent.primaryName'] = 'Primary parent name required';
    
    if (!parent.primaryEmail) {
      newErrors['parent.primaryEmail'] = 'Primary email required';
    } else if (!emailRegex.test(parent.primaryEmail)) {
      newErrors['parent.primaryEmail'] = 'Invalid email format';
    }

    if (!parent.primaryMobile) {
      newErrors['parent.primaryMobile'] = 'Primary mobile required';
    } else if (!phoneRegex.test(cleanPhone(parent.primaryMobile))) {
      newErrors['parent.primaryMobile'] = 'Enter valid 10-digit number';
    }

    // Secondary Parent (Optional, but validate if entered)
    if (parent.secondaryEmail && !emailRegex.test(parent.secondaryEmail)) {
      newErrors['parent.secondaryEmail'] = 'Invalid email format';
    }
    if (parent.secondaryMobile && !phoneRegex.test(cleanPhone(parent.secondaryMobile))) {
      newErrors['parent.secondaryMobile'] = 'Enter valid 10-digit number';
    }

    // 4. Payment Validation
    if (!paymentUtr.trim()) newErrors['paymentUtr'] = 'UTR number is required for verification';

    return newErrors;
  };

  // Helper to re-validate a specific field on change
  const validateFieldOnChange = (newData: FormData, fieldKey: string) => {
    const allErrors = getValidationErrors(newData);
    const fieldError = allErrors[fieldKey];

    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      
      if (!fieldError) {
        // If valid, always remove error
        delete newErrors[fieldKey];
      } else if (submitted || prevErrors[fieldKey]) {
        // If invalid, update error ONLY if form is submitted or field was already invalid
        // This prevents showing errors immediately when user starts typing in a fresh field
        newErrors[fieldKey] = fieldError;
      }
      
      return newErrors;
    });
  };

  const handleNestedChange = (
    section: 'student' | 'parent',
    field: string,
    value: string | number
  ) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      // Validate immediately after state calculation for accuracy
      validateFieldOnChange(newData, `${section}.${field}`);
      return newData;
    });
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => {
      const newData = { ...prev, agreedToTerms: checked };
      validateFieldOnChange(newData, 'agreedToTerms');
      return newData;
    });
  };

  const handlePaymentChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, paymentUtr: value };
      validateFieldOnChange(newData, 'paymentUtr');
      return newData;
    });
  };

  const validateForm = (): boolean => {
    const newErrors = getValidationErrors(formData);
    setErrors(newErrors);
    
    // Auto-scroll to first error
    if (Object.keys(newErrors).length > 0) {
      const firstErrorKey = Object.keys(newErrors)[0];
      // Extract field name (e.g. "student.fullName" -> "fullName") to match ID
      const fieldName = firstErrorKey.includes('.') ? firstErrorKey.split('.')[1] : firstErrorKey;
      
      // Find element by ID (InputGroup default) or Name (Checkbox/Radio)
      const element = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optional: Focus the element if possible to aid accessibility
        if (element instanceof HTMLElement) {
          element.focus({ preventScroll: true });
        }
      } else {
         // Fallback if element not found
         window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const saveToCSV = () => {
    // 1. Flatten Data
    const flatData = {
      'Trip Name': tripName,
      'Full Name': formData.student.fullName,
      'Initials Name': formData.student.initialsName,
      'Age': formData.student.age,
      'DOB': formData.student.dob,
      'Gender': formData.student.gender,
      'Section': formData.student.section,
      'Medical Conditions': formData.student.medicalConditions,
      'Student Email': formData.student.email,
      'Student Mobile': formData.student.mobile,
      'Primary Parent': formData.parent.primaryName,
      'Primary Email': formData.parent.primaryEmail,
      'Primary Mobile': formData.parent.primaryMobile,
      'Secondary Parent': formData.parent.secondaryName,
      'Secondary Email': formData.parent.secondaryEmail,
      'Secondary Mobile': formData.parent.secondaryMobile,
      'Payment UTR': formData.paymentUtr,
      'Timestamp': new Date().toLocaleString()
    };

    // 2. Generate CSV Content
    const headers = Object.keys(flatData).join(',');
    const values = Object.values(flatData).map(v => `"${v}"`).join(','); // Quote values to handle commas in data
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + values;

    // 3. Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `${tripName || 'Registration'}_${formData.student.fullName.replace(/\s+/g, '_')}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log("Form Valid & Submitted:", formData);
      
      // NOTE: In a real backend implementation, you would use fetch() here:
      // await fetch('YOUR_BACKEND_API/submit', { method: 'POST', body: JSON.stringify({ tripName, ...formData }) })
      
      // For now, download locally
      saveToCSV();
      
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log("Validation Failed");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here, using simple alert for now per request
    alert('UPI ID copied to clipboard!');
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Registration Complete!</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Thank you for registering for <strong>{tripName}</strong>. 
          <br/>
          Your details have been recorded and a copy has been downloaded to your device.
        </p>
        
        <div className="flex gap-4">
            <button 
            onClick={saveToCSV}
            className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors border border-slate-200 px-4 py-2 rounded-lg hover:border-primary/30"
            >
            <Download className="w-4 h-4" />
            Download Copy Again
            </button>
            
            <button 
            onClick={() => window.location.reload()}
            className="text-primary hover:text-primary/80 font-semibold transition-colors px-4 py-2"
            >
            Submit another response
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
         <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Trip Name</span>
            <p className="text-lg font-bold text-indigo-900">{tripName || 'General Trip'}</p>
         </div>
      </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        
        {/* 1. Terms Section */}
        <TermsSection 
            agreedToTerms={formData.agreedToTerms} 
            onChange={handleCheckboxChange} 
            error={errors['agreedToTerms']} 
        />

        {/* 2. Student Details Section */}
        <StudentSection 
            data={formData.student} 
            onChange={(field, value) => handleNestedChange('student', field, value)} 
            errors={errors} 
        />

        {/* 3. Parent/Guardian Details Section */}
        <ParentSection 
            data={formData.parent} 
            onChange={(field, value) => handleNestedChange('parent', field, value as string)} 
            errors={errors} 
        />

        {/* 4. Payment Section */}
        <PaymentSection 
            paymentUtr={formData.paymentUtr} 
            onChange={handlePaymentChange} 
            error={errors['paymentUtr']} 
            onCopy={copyToClipboard}
        />

        {/* Submit Action */}
        <div className="sticky bottom-4 z-10 pt-2">
            <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-slate-200 transform transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 flex items-center justify-center gap-2 text-base"
            >
            <span>Submit Registration</span>
            <Send className="w-4 h-4" />
            </button>
        </div>

        </form>
    </div>
  );
};