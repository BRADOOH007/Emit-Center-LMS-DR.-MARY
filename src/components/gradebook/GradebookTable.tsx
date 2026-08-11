'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  MessageCircle,
  Search,
  Trophy,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { MOCK_GRADEBOOK, MOCK_USERS, MOCK_QUIZZES, MOCK_ASSIGNMENTS, MOCK_COURSES } from '@/lib/mock-data';
import type { GradebookEntry, LetterGrade } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const GRADE_COLORS: Record<LetterGrade, string> = {
  'A+': 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30',
  'A': 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  'A-': 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  'B+': 'bg-blue-500/10 text-blue-700 ring-blue-500/20',
  'B': 'bg-blue-500/10 text-blue-700 ring-blue-500/20',
  'B-': 'bg-blue-500/10 text-blue-700 ring-blue-500/20',
  'C+': 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
  'C': 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
  'C-': 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
  'D': 'bg-orange-500/10 text-orange-700 ring-orange-500/20',
  'F': 'bg-red-500/10 text-red-700 ring-red-500/20',
  'INC': 'bg-gray-500/10 text-gray-600 ring-gray-500/20',
};

export function GradebookTable({ courseId }: { courseId: string }) {
  const [courseIdState, setCourseIdState] = useState(courseId);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'student' | 'overall' | 'practical'>('overall');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedEntry, setSelectedEntry] = useState<GradebookEntry | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const course = MOCK_COURSES.find((c) => c.id === courseIdState);
  const entries = useMemo(() => {
    let data = MOCK_GRADEBOOK.filter((e) => e.courseId === courseIdState).map((e) => ({
      ...e,
      user: MOCK_USERS.find((u) => u.id === e.userId),
    }));

    if (search) {
      const q = search.toLowerCase();
      data = data.filter((e) => e.user?.fullName.toLowerCase().includes(q) || e.user?.email.toLowerCase().includes(q));
    }

    data.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'student') cmp = (a.user?.fullName ?? '').localeCompare(b.user?.fullName ?? '');
      else if (sortField === 'overall') cmp = a.overallPercentage - b.overallPercentage;
      else if (sortField === 'practical') cmp = a.practicalScore - b.practicalScore;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [courseIdState, search, sortField, sortDir]);

  const stats = useMemo(() => {
    if (entries.length === 0) return { avg: 0, max: 0, min: 0, count: 0 };
    const pcts = entries.map((e) => e.overallPercentage);
    return {
      avg: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length * 10) / 10,
      max: Math.max(...pcts),
      min: Math.min(...pcts),
      count: entries.length,
    };
  }, [entries]);

  const handleSortChange = useCallback((field: typeof sortField) => {
    setSortField(field);
    setSortDir((prev) => (sortField === field && prev === 'asc' ? 'desc' : 'asc'));
  }, [sortField]);

  const handleSaveComment = useCallback(() => {
    if (!selectedEntry) return;
    selectedEntry.comments = commentInput;
    selectedEntry.lastUpdated = new Date().toISOString();
    setSelectedEntry(null);
    setCommentInput('');
  }, [selectedEntry, commentInput]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label htmlFor="gradebook-course" className="label">Course</label>
          <select
            id="gradebook-course"
            value={courseIdState}
            onChange={(e) => setCourseIdState(e.target.value)}
            className="input !py-2 min-w-[18rem]"
          >
            {MOCK_COURSES.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="input !pl-9 !py-2"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">Average</p>
          <p className="mt-1 font-display text-2xl font-bold text-text-primary">{stats.avg}%</p>
        </div>
        <div className="panel text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">Highest</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-600">{stats.max}%</p>
        </div>
        <div className="panel text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">Students</p>
          <p className="mt-1 font-display text-2xl font-bold text-text-primary">{stats.count}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-panel border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-line-soft/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase text-text-muted">
                <button type="button" onClick={() => handleSortChange('student')} className="flex items-center gap-1 hover:text-text-primary">
                  Student
                  {sortField === 'student' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-muted">Quiz</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-muted">Assignment</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-muted">
                <button type="button" onClick={() => handleSortChange('practical')} className="flex items-center gap-1 hover:text-text-primary mx-auto">
                  Practical
                  {sortField === 'practical' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-muted">
                <button type="button" onClick={() => handleSortChange('overall')} className="flex items-center gap-1 hover:text-text-primary mx-auto">
                  Overall
                  {sortField === 'overall' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-muted">Grade</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-muted"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-line-soft/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-text-primary">{entry.user?.fullName}</p>
                    <p className="text-xs text-text-muted">{entry.user?.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-text-primary">
                    {entry.quizScores[0]?.percentage ?? '-'}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-text-primary">
                    {entry.assignmentScores[0]?.percentage ?? '-'}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-text-primary">
                    {entry.practicalScore}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line-soft">
                      <div
                        className={cn('h-full rounded-full', entry.overallPercentage >= 80 ? 'bg-emerald-500' : entry.overallPercentage >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${entry.overallPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-text-primary">{entry.overallPercentage}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('badge badge-gold', GRADE_COLORS[entry.letterGrade])}>
                    {entry.letterGrade}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => { setSelectedEntry(entry); setCommentInput(entry.comments); }}
                    className="btn btn-ghost btn-sm"
                    aria-label="Edit comments"
                  >
                    <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div aria-hidden="true" onClick={() => setSelectedEntry(null)} className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 w-full max-w-md animate-scale-in rounded-card border border-line bg-base-elevated p-5 shadow-pop">
            <h3 className="font-semibold text-text-primary">
              Comments for {selectedEntry.user?.fullName}
            </h3>
            <p className="mt-1 text-xs text-text-muted">Overall: {selectedEntry.overallPercentage}% — Grade: {selectedEntry.letterGrade}</p>
            <div className="divider my-3" />
            <label htmlFor="grade-comment" className="label">Instructor comments</label>
            <textarea
              id="grade-comment"
              rows={4}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="input !py-2"
              placeholder="Add feedback for this student..."
            />
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => setSelectedEntry(null)} className="flex-1">Cancel</Button>
              <Button variant="gold" onClick={handleSaveComment} className="flex-1">Save comment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
