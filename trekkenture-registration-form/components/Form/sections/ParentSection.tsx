import React from 'react';
import { Users } from 'lucide-react';
import { InputGroup } from '../../InputGroup';
import { ParentDetails, FormErrors } from '../../../types';

interface ParentSectionProps {
  data: ParentDetails;
  onChange: (field: string, value: string) => void;
  errors: FormErrors;
}

export const ParentSection: React.FC<ParentSectionProps> = ({ data, onChange, errors }) => {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">3</div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          Parent / Guardian Details
        </h2>
      </div>
      
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-8">
        {/* Primary Contact */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-px flex-1 bg-slate-100"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Contact</span>
            <span className="h-px flex-1 bg-slate-100"></span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputGroup
              label="Parent Name"
              name="primaryName"
              required
              className="sm:col-span-2"
              value={data.primaryName}
              onChange={(e) => onChange('primaryName', e.target.value)}
              error={errors['parent.primaryName']}
            />
            <InputGroup
              label="Email"
              name="primaryEmail"
              type="email"
              required
              value={data.primaryEmail}
              onChange={(e) => onChange('primaryEmail', e.target.value)}
              error={errors['parent.primaryEmail']}
            />
            <InputGroup
              label="Mobile"
              name="primaryMobile"
              type="tel"
              required
              value={data.primaryMobile}
              onChange={(e) => onChange('primaryMobile', e.target.value)}
              error={errors['parent.primaryMobile']}
            />
          </div>
        </div>

        {/* Secondary Contact */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-px flex-1 bg-slate-100"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Secondary Contact</span>
            <span className="h-px flex-1 bg-slate-100"></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputGroup
              label="Parent Name"
              name="secondaryName"
              className="sm:col-span-2"
              value={data.secondaryName}
              onChange={(e) => onChange('secondaryName', e.target.value)}
              error={errors['parent.secondaryName']}
            />
            <InputGroup
              label="Email"
              name="secondaryEmail"
              type="email"
              value={data.secondaryEmail}
              onChange={(e) => onChange('secondaryEmail', e.target.value)}
              error={errors['parent.secondaryEmail']}
            />
            <InputGroup
              label="Mobile"
              name="secondaryMobile"
              type="tel"
              value={data.secondaryMobile}
              onChange={(e) => onChange('secondaryMobile', e.target.value)}
              error={errors['parent.secondaryMobile']}
            />
          </div>
        </div>
      </div>
    </section>
  );
};