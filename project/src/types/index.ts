export interface Profile {
  id: string;
  full_name: string;
  phone_number: string;
  role: 'admin' | 'member';
  member_since: string;
  payment_due: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
}

export interface Facilitator {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  created_at: string;
}

export interface Facility {
  id: string;
  name: string;
  facility_type: string;
  description: string;
  price: number;
  capacity: number;
  facilitator_id: string | null;
  is_active: boolean;
  created_at: string;
  facilitators?: Facilitator;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  description: string;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  facility_id: string;
  member_id: string;
  booked_date: string;
  booked_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes: string;
  datetime_of_booking: string;
  created_at: string;
  facilities?: Facility;
  profiles?: Profile;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  payment_type: 'membership' | 'booking' | 'other';
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  booking_id: string | null;
  datetime_of_payment: string;
  created_at: string;
  profiles?: Profile;
}

export interface FitnessGoal {
  id: string;
  user_id: string;
  goal_type: 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'general_fitness';
  target_weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietary_preference: 'balanced' | 'vegetarian' | 'vegan' | 'keto' | 'high_protein' | 'low_carb';
  updated_at: string;
}

export interface FitnessProgress {
  id: string;
  user_id: string;
  recorded_date: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_percent: number | null;
  bmi: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  notes: string;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_date: string;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  sets: number;
  reps: number;
  notes: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  channel: 'email' | 'sms' | 'in_app';
  subject: string;
  message: string;
  status: 'sent' | 'pending' | 'failed';
  related_type: string;
  related_id: string | null;
  created_at: string;
}

export interface PendingTermination {
  id: string;
  member_id: string;
  reason: string;
  request_date: string;
  payment_due: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: Profile;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  action?: BookingAction;
}

export interface BookingAction {
  type: 'booking_created' | 'booking_cancelled' | 'show_facilities' | 'show_bookings';
  data?: unknown;
}
