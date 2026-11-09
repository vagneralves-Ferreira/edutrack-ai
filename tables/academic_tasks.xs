table academic_tasks {
  id uuid [pk, default: gen_random_uuid()]
  title string [not null]
  description text
  status string [default: 'pendente']
  due_date timestamp
  created_at timestamp [default: now()]
}
