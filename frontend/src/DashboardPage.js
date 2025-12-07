import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './App.css';

const API_BASE = 'http://127.0.0.1:8000';

function DashboardPage() {
  const navigate = useNavigate();
  const [region, setRegion] = useState('Global');
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [filterOptions, setFilterOptions] = useState({
    regions: ['Global'],
    industries: [],
    experience_levels: [],
    job_titles: [],
  });

  const [trends, setTrends] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [jobPostings, setJobPostings] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      region,
      industry,
      experience,
    });
    if (jobTitle) {
      params.append('job_title', jobTitle);
    }
    try {
      const [trRes, jobsRes, postingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/trends?${params.toString()}`),
        fetch(`${API_BASE}/api/jobs?${params.toString()}`),
        fetch(`${API_BASE}/api/job-postings?${params.toString()}&limit=10`),
      ]);
      
      // Check if responses are ok
      if (!postingsRes.ok) {
        const errorText = await postingsRes.text();
        console.error('Job postings API error:', postingsRes.status, errorText);
        setJobPostings({ postings: [], total: 0, source: 'error' });
      } else {
        const postingsJson = await postingsRes.json();
        console.log('Job postings response:', postingsJson);
        setJobPostings(postingsJson);
      }
      
      const trJson = await trRes.json();
      const jobsJson = await jobsRes.json();
      setTrends(trJson);
      setJobs(jobsJson);
    } catch (e) {
      console.error('Failed to load insights', e);
      // Set empty state on error
      setJobPostings({ postings: [], total: 0, source: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Load job titles when industry changes
  useEffect(() => {
    const loadJobTitles = async () => {
      if (!industry || industry === '') {
        setFilterOptions(prev => ({ ...prev, job_titles: [] }));
        setJobTitle('');
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/job-titles?industry=${encodeURIComponent(industry)}`);
        const data = await res.json();
        setFilterOptions(prev => ({
          ...prev,
          job_titles: data.job_titles || [],
        }));
        // Reset job title when industry changes
        setJobTitle('');
      } catch (e) {
        console.error('Failed to load job titles', e);
        setFilterOptions(prev => ({ ...prev, job_titles: [] }));
      }
    };

    loadJobTitles();
  }, [industry]);

  useEffect(() => {
    const loadFiltersAndData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/filters`);
        const data = await res.json();
        setFilterOptions(prev => ({
          ...prev,
          regions: ['Global', ...(data.regions || [])],
          industries: data.industries || [],
          experience_levels: data.experience_levels || [],
        }));
        // Set sensible defaults from dataset if available
        if (data.industries && data.industries.length > 0) {
          setIndustry(data.industries[0]);
        }
        if (data.experience_levels && data.experience_levels.length > 0) {
          setExperience(data.experience_levels[0]);
        }
      } catch (e) {
        console.error('Failed to load filter options', e);
      } finally {
        // After filters (or even if they fail), load data
        loadData();
      }
    };

    loadFiltersAndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
  };

  const applyFilters = () => {
    loadData();
  };

  const openingsData = useMemo(() => {
    return jobs?.openings?.filter(job => job && job.title && job.openings > 0) || [];
  }, [jobs]);

  // Prepare data for visualizations
  const skillsChartData = useMemo(() => {
    if (!trends?.in_demand_skills || trends.in_demand_skills.length === 0) return [];
    return trends.in_demand_skills
      .filter(s => s && s.skill)
      .map((s, idx) => ({
        name: s.skill,
        value: trends.in_demand_skills.length - idx, // Approximate frequency
        trend: s.trend || 'stable',
      }));
  }, [trends]);

  const salaryChartData = useMemo(() => {
    if (!trends?.salary_insights || trends.salary_insights.length === 0) return [];
    return trends.salary_insights
      .filter(s => s && s.role && s.median > 0)
      .map((s) => ({
        role: s.role.length > 15 ? s.role.substring(0, 15) + '...' : s.role,
        fullRole: s.role,
        salary: s.median,
      }));
  }, [trends]);

  const growthChartData = useMemo(() => {
    if (!jobs?.openings || jobs.openings.length === 0) return [];
    return jobs.openings
      .filter(job => job && job.title && job.growth !== undefined)
      .map((job) => ({
        title: job.title.length > 12 ? job.title.substring(0, 12) + '...' : job.title,
        fullTitle: job.title,
        openings: job.openings || 0,
        growth: ((job.growth || 0) * 100).toFixed(1) + '%',
        growthValue: job.growth || 0,
      }));
  }, [jobs]);

  // Color palette
  const COLORS = ['#1e9ff5', '#ff8a00', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
  const PIE_COLORS = ['#1e9ff5', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];

  return (
    <div className="app-shell dashboard-root">
      <nav className="ci-navbar">
        <div className="ci-navbar-left">
          <div className="ci-logo">
            Career<span>Insights</span>
          </div>
          <div className="ci-nav-links">
            <span className="ci-nav-link ci-nav-link-active">Dashboard</span>
            <span className="ci-nav-link" onClick={() => navigate('/resume-analyzer')} style={{ cursor: 'pointer' }}>
              Resume Analyzer
            </span>
            <span className="ci-nav-link" onClick={() => navigate('/interview-prep')} style={{ cursor: 'pointer' }}>
              Interview Prep
            </span>
            <span className="ci-nav-link">Reports</span>
          </div>
        </div>
        <div className="ci-navbar-right">
          <span>{region}</span>
        </div>
      </nav>

      <main className="ci-dashboard">
        <header className="ci-dashboard-header">
          <div>
            <h1 className="ci-dashboard-title">Market Insights Overview</h1>
            <p className="ci-dashboard-subtitle">
              Real-time labor market trends, in-demand skills, and salary insights
              for your selected filters.
            </p>
          </div>
          <div className="ci-filter-row">
            <select
              className="ci-select"
              value={region}
              onChange={handleFilterChange(setRegion)}
            >
              {filterOptions.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="ci-select"
              value={jobTitle}
              onChange={handleFilterChange(setJobTitle)}
              disabled={!industry || industry === '' || filterOptions.job_titles.length === 0}
              style={{ minWidth: '200px' }}
            >
              <option value="">All Job Titles</option>
              {filterOptions.job_titles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            <select
              className="ci-select"
              value={industry}
              onChange={handleFilterChange(setIndustry)}
            >
              {filterOptions.industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <select
              className="ci-select"
              value={experience}
              onChange={handleFilterChange(setExperience)}
            >
              {filterOptions.experience_levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            <button
              className="ci-apply-btn"
              onClick={applyFilters}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
        </header>

        {/* Key Metrics Row */}
        <section className="ci-metrics-row">
          <div className="ci-metric-card">
            <div className="ci-metric-icon ci-metric-icon-blue">📊</div>
            <div className="ci-metric-content">
              <div className="ci-metric-value">
                {loading ? '...' : (jobs?.openings?.length || 0)}
              </div>
              <div className="ci-metric-label">Top Job Roles</div>
            </div>
          </div>
          <div className="ci-metric-card">
            <div className="ci-metric-icon ci-metric-icon-orange">💼</div>
            <div className="ci-metric-content">
              <div className="ci-metric-value">
                {loading ? '...' : (
                  jobs?.openings?.reduce((sum, j) => sum + (j.openings || 0), 0).toLocaleString() || 0
                )}
              </div>
              <div className="ci-metric-label">Total Openings</div>
            </div>
          </div>
          <div className="ci-metric-card">
            <div className="ci-metric-icon ci-metric-icon-green">💰</div>
            <div className="ci-metric-content">
              <div className="ci-metric-value">
                {loading ? '...' : (
                  trends?.salary_insights?.[0]?.median 
                    ? `$${trends.salary_insights[0].median.toLocaleString()}` 
                    : 'N/A'
                )}
              </div>
              <div className="ci-metric-label">Top Salary</div>
            </div>
          </div>
          <div className="ci-metric-card">
            <div className="ci-metric-icon ci-metric-icon-purple">📈</div>
            <div className="ci-metric-content">
              <div className="ci-metric-value">
                {loading ? '...' : (
                  growthChartData.length > 0 && growthChartData.some(g => g.growthValue > 0)
                    ? (Math.max(...growthChartData.map(g => g.growthValue || 0)) * 100).toFixed(1) + '%'
                    : 'N/A'
                )}
              </div>
              <div className="ci-metric-label">Max Growth Rate</div>
            </div>
          </div>
        </section>

        {/* Main Charts Grid */}
        <section className="ci-dashboard-grid">
          {/* Skills Visualization */}
          <div className="ci-card ci-card-skills">
            <h2 className="ci-card-title">In-demand Skills</h2>
            <p className="ci-card-subtitle">
              Top skills with demand trends
            </p>
            <div className="ci-skills-chart-wrapper">
              {skillsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={skillsChartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {skillsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.trend === 'rising' ? '#10b981' : '#1e9ff5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="ci-no-data" style={{ padding: '40px 20px' }}>No skills data available</div>
              )}
            </div>
            <ul className="ci-skill-list-compact">
              {trends?.in_demand_skills?.slice(0, 3).map((s) => (
                <li key={s.skill} className="ci-skill-item-compact">
                  <span>{s.skill}</span>
                  <span className={`ci-trend-pill ci-trend-${s.trend}`}>
                    {s.trend}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Salary Distribution */}
          <div className="ci-card ci-card-salary">
            <h2 className="ci-card-title">Salary Distribution</h2>
            <p className="ci-card-subtitle">
              Median salaries by role
            </p>
            <div className="ci-salary-visualization">
              {salaryChartData.length > 0 ? (
                (() => {
                  const salaries = salaryChartData.map(s => s.salary).filter(s => s > 0);
                  if (salaries.length === 0) {
                    return <div className="ci-no-data">No salary data available</div>;
                  }
                  const maxSalary = Math.max(...salaries);
                  return salaryChartData.map((item, index) => {
                    if (!item.salary || item.salary <= 0) return null;
                    const percentage = (item.salary / maxSalary) * 100;
                    return (
                      <div key={item.fullRole} className="ci-salary-item-visual">
                        <div className="ci-salary-header">
                          <span className="ci-salary-role">{item.fullRole}</span>
                          <span className="ci-salary-amount">${item.salary.toLocaleString()}</span>
                        </div>
                        <div className="ci-salary-progress-container">
                          <div 
                            className="ci-salary-progress-bar"
                            style={{ 
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[index % COLORS.length]}dd)`
                            }}
                          >
                            <div className="ci-salary-progress-glow"></div>
                          </div>
                        </div>
                        <div className="ci-salary-stats">
                          <span className="ci-salary-rank">#{index + 1}</span>
                          <span className="ci-salary-percentage">{percentage.toFixed(0)}% of max</span>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="ci-no-data">No salary data available</div>
              )}
            </div>
          </div>

          {/* Job Openings Bar Chart */}
          <div className="ci-card ci-card-chart">
            <h2 className="ci-card-title">Job Openings</h2>
            <p className="ci-card-subtitle">
              Available positions by role
            </p>
            <div className="ci-chart-wrapper">
              {openingsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={openingsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="title" 
                      tick={{ fontSize: 11 }} 
                      angle={-15} 
                      textAnchor="end" 
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="openings" radius={[8, 8, 0, 0]}>
                      {openingsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="ci-no-data" style={{ padding: '40px 20px' }}>No job openings data available</div>
              )}
            </div>
          </div>

          {/* Growth Trends */}
          <div className="ci-card ci-card-growth">
            <h2 className="ci-card-title">Growth Projections</h2>
            <p className="ci-card-subtitle">
              Projected growth rates by role
            </p>
            <div className="ci-chart-wrapper">
              {growthChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={growthChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="title" 
                      tick={{ fontSize: 11 }} 
                      angle={-15} 
                      textAnchor="end" 
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      label={{ value: 'Growth %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => [(value * 100).toFixed(1) + '%', 'Growth']}
                      labelFormatter={(label) => {
                        const full = growthChartData.find(d => d.title === label)?.fullTitle;
                        return full || label;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="growthValue" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="ci-no-data" style={{ padding: '40px 20px' }}>No growth data available</div>
              )}
            </div>
          </div>

          {/* Skills Pie Chart */}
          <div className="ci-card ci-card-pie">
            <h2 className="ci-card-title">Skills Distribution</h2>
            <p className="ci-card-subtitle">
              Relative demand for top skills
            </p>
            <div className="ci-chart-wrapper">
              {skillsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={skillsChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {skillsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="ci-no-data" style={{ padding: '40px 20px' }}>No skills distribution data available</div>
              )}
            </div>
          </div>
        </section>

        {/* Job Postings Section */}
        <section className="ci-job-postings-section">
          <div className="ci-card ci-card-postings">
            <div className="ci-postings-header">
              <div>
                <h2 className="ci-card-title">Job Postings</h2>
                <p className="ci-card-subtitle">
                  {jobPostings?.total ? `${jobPostings.total.toLocaleString()} total jobs found` : 'Loading job postings...'}
                </p>
              </div>
            </div>
            <div className="ci-postings-list">
              {jobPostings?.postings && jobPostings.postings.length > 0 ? (
                jobPostings.postings.map((posting) => (
                  <div key={posting.job_id} className="ci-posting-card">
                    <div className="ci-posting-header">
                      <div className="ci-posting-title-row">
                        <h3 className="ci-posting-title">{posting.job_title}</h3>
                        {posting.salary && (
                          <span className="ci-posting-salary">
                            ${posting.salary.toLocaleString()}
                            {posting.salary_currency && posting.salary_currency !== 'USD' && ` ${posting.salary_currency}`}
                          </span>
                        )}
                      </div>
                      <div className="ci-posting-company">{posting.company_name}</div>
                    </div>
                    <div className="ci-posting-details">
                      <div className="ci-posting-tags">
                        <span className="ci-posting-tag">
                          📍 {posting.company_location}
                        </span>
                        <span className="ci-posting-tag">
                          💼 {posting.experience_level}
                        </span>
                        <span className="ci-posting-tag">
                          🏢 {posting.employment_type}
                        </span>
                        {posting.remote_ratio > 0 && (
                          <span className="ci-posting-tag ci-posting-tag-remote">
                            🏠 {posting.remote_ratio === 100 ? 'Remote' : `${posting.remote_ratio}% Remote`}
                          </span>
                        )}
                        {posting.company_size && posting.company_size !== 'Unknown' && (
                          <span className="ci-posting-tag">
                            👥 {posting.company_size}
                          </span>
                        )}
                      </div>
                      {posting.skills && posting.skills.trim() && (
                        <div className="ci-posting-skills">
                          <span className="ci-posting-skills-label">Skills:</span>
                          <div className="ci-posting-skills-list">
                            {posting.skills.split(',').slice(0, 5).map((skill, idx) => (
                              <span key={idx} className="ci-posting-skill-badge">
                                {skill.trim()}
                              </span>
                            ))}
                            {posting.skills.split(',').length > 5 && (
                              <span className="ci-posting-skill-badge">+{posting.skills.split(',').length - 5} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="ci-no-data">No job postings available for selected filters</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;


