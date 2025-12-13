import type { CreateClientRequest } from './types'

interface ClientFormFieldsProps {
  form: CreateClientRequest
  updateField: <K extends keyof CreateClientRequest>(field: K, value: CreateClientRequest[K]) => void
  isSubmitting: boolean
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const initialFormState: CreateClientRequest = {
  name: '',
  address: '',
  family_size: 1,
  num_children: 0,
  children_ages: '',
  reason: '',
  appointment_day: '',
  appointment_time: '',
  pref_gluten_free: false,
  pref_halal: false,
  pref_vegetarian: false,
  pref_no_cooking: false,
}

export default function ClientFormFields({ form, updateField, isSubmitting }: ClientFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name *</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Family Size *</span>
          </label>
          <input
            type="number"
            min="1"
            className="input input-bordered"
            value={form.family_size}
            onChange={(e) => updateField('family_size', parseInt(e.target.value) || 1)}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Address *</span>
        </label>
        <textarea
          className="textarea textarea-bordered"
          rows={2}
          value={form.address}
          onChange={(e) => updateField('address', e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Number of Children</span>
          </label>
          <input
            type="number"
            min="0"
            className="input input-bordered"
            value={form.num_children}
            onChange={(e) => updateField('num_children', parseInt(e.target.value) || 0)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Children's Ages</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="e.g., 3, 7, 12"
            value={form.children_ages}
            onChange={(e) => updateField('children_ages', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Reason for Referral</span>
        </label>
        <textarea
          className="textarea textarea-bordered"
          rows={2}
          value={form.reason}
          onChange={(e) => updateField('reason', e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Preferred Appointment Day</span>
          </label>
          <select
            className="select select-bordered"
            value={form.appointment_day}
            onChange={(e) => updateField('appointment_day', e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select a day</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Preferred Time</span>
          </label>
          <input
            type="time"
            className="input input-bordered"
            value={form.appointment_time}
            onChange={(e) => updateField('appointment_time', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="divider">Food Preferences</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={form.pref_halal}
            onChange={(e) => updateField('pref_halal', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="label-text">Halal</span>
        </label>

        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={form.pref_vegetarian}
            onChange={(e) => updateField('pref_vegetarian', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="label-text">Vegetarian</span>
        </label>

        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={form.pref_gluten_free}
            onChange={(e) => updateField('pref_gluten_free', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="label-text">Gluten Free</span>
        </label>

        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={form.pref_no_cooking}
            onChange={(e) => updateField('pref_no_cooking', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="label-text">No Cooking</span>
        </label>
      </div>
    </div>
  )
}
