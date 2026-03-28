import React from 'react';
import { User } from 'lucide-react';
import { InputGroup } from '../../InputGroup';
import { StudentDetails, FormErrors } from '../../../types';
import { STUDENT_SECTIONS } from '../../../data/constants';

interface StudentSectionProps {
  data: StudentDetails;
  onChange: (field: string, value: string | number) => void;
  errors: FormErrors;
}

export const StudentSection: React.FC<StudentSectionProps> = ({ data, onChange, errors }) => {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">2</div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" />
          Student Details
        </h2>
      </div>
      
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputGroup
          label="Full Name (As on ID Card)"
          name="fullName"
          required
          placeholder="e.g. John Doe"
          value={data.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
          error={errors['student.fullName']}
        />
        
        <InputGroup
          label="Name with Initials (Train Booking)"
          name="initialsName"
          required
          placeholder="e.g. Doe J."
          value={data.initialsName}
          onChange={(e) => onChange('initialsName', e.target.value)}
          error={errors['student.initialsName']}
        />

        <div className="grid grid-cols-2 gap-5">
          <InputGroup
            label="Age"
            name="age"
            type="number"
            min="5"
            max="25"
            required
            value={data.age}
            onChange={(e) => onChange('age', e.target.value)}
            error={errors['student.age']}
          />
          <InputGroup
            label="Date of Birth"
            name="dob"
            type="date"
            required
            value={data.dob}
            onChange={(e) => onChange('dob', e.target.value)}
            error={errors['student.dob']}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-0.5">
            Gender <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2 h-[42px] items-center">
            {['Male', 'Female'].map((g) => (
              <label key={g} className="flex-1 relative cursor-pointer group">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={data.gender === g}
                  onChange={(e) => onChange('gender', e.target.value)}
                  className="peer sr-only"
                />
                <div className={`h-full w-full rounded-md border text-sm flex items-center justify-center transition-all ${
                  errors['student.gender'] 
                  ? 'border-rose-500 bg-white text-slate-600 hover:bg-slate-50 peer-checked:bg-primary/5 peer-checked:border-primary peer-checked:text-primary' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 peer-checked:bg-primary/5 peer-checked:border-primary peer-checked:text-primary'
                }`}>
                  {g}
                </div>
              </label>
            ))}
          </div>
          {errors['student.gender'] && (
             <p className="text-xs text-rose-600 font-medium ml-0.5 animate-pulse">{errors['student.gender']}</p>
          )}
        </div>

        <InputGroup
          label="Section"
          name="section"
          as="select"
          required
          options={STUDENT_SECTIONS}
          value={data.section}
          onChange={(e) => onChange('section', e.target.value)}
          error={errors['student.section']}
        />

        <InputGroup
          label="Student Email"
          name="email"
          type="email"
          required
          placeholder="student@example.com"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
          error={errors['student.email']}
        />

        <InputGroup
          label="Student Mobile"
          name="mobile"
          type="tel"
          required
          placeholder="+91 XXXXX XXXXX"
          value={data.mobile}
          onChange={(e) => onChange('mobile', e.target.value)}
          error={errors['student.mobile']}
        />

        <div className="sm:col-span-2">
          <InputGroup
            label="Allergies / Medical Conditions"
            name="medicalConditions"
            required
            placeholder="Enter 'None' if not applicable"
            value={data.medicalConditions}
            onChange={(e) => onChange('medicalConditions', e.target.value)}
            error={errors['student.medicalConditions']}
          />
        </div>
      </div>
    </section>
  );
};