import React, { useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';

export const SubjectsView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('edutrack_subjects');
    return saved ? JSON.parse(saved) : [
      { id: '1', code: 'IMP-SQL101', name: 'SQL Fundamentals', professor: 'Prof. Evandro', progress: 78 },
      { id: '2', code: 'IMP-ENG201', name: 'Software Engineering', professor: 'Prof. Fábio Nogueira', progress: 65 },
      { id: '3', code: 'IMP-ALG102', name: 'Programming & Algorithms', professor: 'Prof. Odair, Prof. João Roberto', progress: 84 },
      { id: '4', code: 'IMP-DBD202', name: 'Database Design', professor: 'Prof. Evandro / Colegiado de Dados', progress: 52 },
      { id: '5', code: 'IMP-INN303', name: 'Innovation Lab: Advanced No/Low Code', professor: 'Prof. Fábio e Mentores de Inovação', progress: 90 }
    ];
  });  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('');

const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;
    const newSub = {
      id: Date.now().toString(),
      code: newCode,
      name: newName,
      professor: newProf || 'Prof. Responsável',
      progress: 0
    };
    const updated = [...subjects, newSub];
    setSubjects(updated);
    localStorage.setItem('edutrack_subjects', JSON.stringify(updated));
    setNewCode('');
    setNewName('');
    setNewProf('');
    setIsModalOpen(false);
  };