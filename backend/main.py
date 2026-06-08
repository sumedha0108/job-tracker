from fastapi import FastAPI
import psycopg2
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from fastapi import UploadFile, File
import shutil
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from groq import Groq
from dotenv import load_dotenv
import pdfplumber
import os
from typing import List
import json

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = (
    f"postgresql://{os.getenv('DATABASE_USER')}:"
    f"{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('DATABASE_HOST')}:5432/"
    f"{os.getenv('DATABASE_NAME')}"
)

def get_conn():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

UPLOAD_DIR = Path("resume_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="resume_uploads"), name="uploads")

class Job(BaseModel):
    company: str
    role: str
    apply_url: str
    status: str
    expected_salary: Optional[float] = None
    track_url: Optional[str] = None


class JobUpdate(BaseModel):
    job_description: Optional[str] = None
    resume_id: Optional[int] = None
    status: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    apply_url: Optional[str] = None
    expected_salary: Optional[float] = None
    track_url: Optional[str] = None

class QA(BaseModel):
    question: str
    answer: str

class InterviewRequest(BaseModel):
    responses: List[QA]


@app.post("/jobs")
def create_jobs(job: Job):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO JOBS (company, role, apply_url, status, expected_salary, track_url) " \
    "values (%s, %s, %s, %s, %s, %s) returning id", 
    (job.company, job.role, job.apply_url, job.status, job.expected_salary, job.track_url))
    job_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": job_id}


@app.get("/jobs")
def read_jobs():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT jobs.id, jobs.company, jobs.role, jobs.apply_url, jobs.status,
            jobs.expected_salary, jobs.track_url, jobs.created_at,
            jobs.resume_id, resumes.filename
        FROM jobs
        LEFT JOIN resumes ON jobs.resume_id = resumes.id
        ORDER BY jobs.created_at DESC
    """)
    jobs = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": job[0],
            "company": job[1],
            "role": job[2],
            "apply_url": job[3],
            "status": job[4],
            "expected_salary": job[5],
            "track_url": job[6],
            "created_at": job[7].isoformat() if job[7] else None,
            "resume_filename": job[9]
        }
        for job in jobs
    ]


@app.get("/stats")
def get_stats():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT count(id), status FROM jobs GROUP BY status")
    jobs = cur.fetchall()
    
    cur.execute("SELECT count(id) FROM jobs")
    total = cur.fetchone()[0]

    cur.close()
    conn.close()
    
    return {
        "total": total,
        "by_status": [{"count": row[0], "status": row[1]} for row in jobs]
    }

@app.post("/resumes")
def create_file(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("INSERT into resumes (filename, file_path) values (%s, %s) returning id", (file.filename, str(file_path)))
    resume_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {"id": resume_id}


@app.patch("/jobs/{job_id}")
def update_job(job_id: int, job: JobUpdate):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE jobs SET 
            job_description = COALESCE(%s, job_description),
            resume_id = COALESCE(%s, resume_id),
            status = COALESCE(%s, status),
            company = COALESCE(%s, company),
            role = COALESCE(%s, role),
            apply_url = COALESCE(%s, apply_url),
            expected_salary = COALESCE(%s, expected_salary),
            track_url = COALESCE(%s, track_url)
        WHERE id = %s
    """, (
        job.job_description, job.resume_id, job.status,
        job.company, job.role, job.apply_url,
        job.expected_salary, job.track_url,
        job_id
    ))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "updated"}


@app.get("/jobs/{id}")
def get_job(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT jobs.id, jobs.company, jobs.role, jobs.apply_url, jobs.status,
            jobs.expected_salary, jobs.track_url, jobs.created_at, jobs.job_description, 
            jobs.resume_id, resumes.filename
        FROM jobs
        LEFT JOIN resumes ON jobs.resume_id = resumes.id
        where jobs.id = %s
    """, (id,))
    job = cur.fetchone()
    cur.close()
    conn.close()
    return {
            "id": job[0],
            "company": job[1],
            "role": job[2],
            "apply_url": job[3],
            "status": job[4],
            "expected_salary": job[5],
            "track_url": job[6],
            "created_at": job[7].isoformat() if job[7] else None,
            "job_description": job[8] if job[8] else None,
            "resume_id": job[9] if job[9] else None,
            "resume_filename": job[10] if job[10] else None
        }


@app.delete("/jobs/{job_id}")
def delete_job(job_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM ats_results WHERE job_id = %s", (job_id,))
    cur.execute("DELETE FROM jobs WHERE id = %s", (job_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "deleted"}


@app.post("/ats/analyze")
def analyze_resume(job_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT jobs.id, jobs.company, jobs.role, 
            jobs.job_description, 
            jobs.resume_id, resumes.filename
        FROM jobs
        LEFT JOIN resumes ON jobs.resume_id = resumes.id
        WHERE jobs.id = %s
    """, (job_id,))
    job = cur.fetchone()
    cur.close()
    conn.close()

    if not job[3]:
        return {"error": "No job description found. Please add a JD first."}
    if not job[5]:
        return {"error": "No resume linked. Please upload a resume first."}

    file_path = UPLOAD_DIR / job[5]
    if not file_path.exists():
        return {"error": "Resume file not found"}
    resume_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                resume_text += page_text + "\n"

    prompt = f"""You are an expert ATS (Applicant Tracking System) analyzer and resume coach.

Analyze the following resume against the job description and provide a detailed assessment.

COMPANY: {job[1]}
ROLE: {job[2]}

JOB DESCRIPTION:
{job[3]}

RESUME:
{resume_text}

Respond ONLY with a JSON object in this exact format, no extra text:
{{
  "score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "jd_keywords": ["<every distinct skill, tool, technology, or qualification required by the JD>", ...],
  "strong_matches": ["<skill or experience that matches>", ...],
  "missing_keywords": ["<important keyword/skill missing from resume>", ...],
  "weaknesses": ["<specific weakness or gap>", ...],
  "suggestions": ["<concrete actionable improvement>", ...],
  "improved_summary": "<rewritten professional summary optimized for this role>"
}}"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = response.choices[0].message.content
    
    import json
    try:
        result = json.loads(raw)
    except:
        result = {"raw": raw}
    
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO ats_results (job_id, resume_id, score, feedback) VALUES (%s, %s, %s, %s)",
        (job[0], job[4], result.get("score"), json.dumps(result))
    )
    conn.commit()
    cur.close()
    conn.close()

    return result


@app.get("/ats/history/{job_id}")
def get_ats_history(job_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT ar.score, ar.created_at, ar.resume_id, r.filename
        FROM ats_results as ar
        LEFT JOIN resumes as r
        on ar.resume_id = r.id
        WHERE ar.job_id = %s
        ORDER BY ar.created_at ASC
    """, (job_id,))
    
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "score": r[0],
            "created_at": r[1].isoformat() if r[1] else None,
            "filename": r[3]
        }
        for r in rows
    ]


@app.post("/interview/start")
def start_interview(job_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT jobs.id, jobs.company, jobs.role, 
            jobs.job_description, 
            jobs.resume_id, resumes.filename
        FROM jobs
        LEFT JOIN resumes ON jobs.resume_id = resumes.id
        WHERE jobs.id = %s
    """, (job_id,))
    job = cur.fetchone()
    cur.close()
    conn.close()

    if not job[3]:
        return {"error": "No job description found. Please add a JD first."}
    if not job[5]:
        return {"error": "No resume linked. Please upload a resume first."}

    file_path = UPLOAD_DIR / job[5]
    if not file_path.exists():
        return {"error": "Resume file not found"}
    resume_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                resume_text += page_text + "\n"

    
    # prompt = f"""
    # Based on this job description and resume,
    # generate 5 interview questions:
    
    # Mix:
    # - 2 technical
    # - 2 behavioral
    # - 1 situational
    
    # Keep them concise.
    # Job Description : {job[3]}
    # Resume content : {resume_text}
    # Only give 5 questions and nothing else in the response.
    # """
    prompt = f"""
    Based on this job description and resume,
    generate 2 interview questions:
    
    Mix: technical, behavioural and situational
    
    Keep them concise.
    Job Description : {job[3]}
    Resume content : {resume_text}
    Only give 2 questions and nothing else in the response.
    """
    
    questions = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    content = questions.choices[0].message.content
    lines = content.split("\n")
    parsed_questions = [
        line.strip("- ").strip()
        for line in lines
        if line.strip()
    ]
    print(parsed_questions)
    
    return {"questions": parsed_questions}


@app.post("/interview/evaluate")
def evaluate_interview(data: InterviewRequest):

    qa_text = ""

    for i, qa in enumerate(data.responses, 1):
        qa_text += f"""
        Q{i}: {qa.question}
        A{i}: {qa.answer}
        """
    prompt = f"""
        Evaluate this full mock interview.

        {qa_text}

        Return ONLY in JSON format:

        {{
        "score": number,
        "communication": "text",
        "technical": "text",
        "strengths": ["point1", "point2"],
        "weaknesses": ["point1", "point2"],
        "suggestions": ["point1", "point2"]
        }}
        """

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    content = response.choices[0].message.content
    print(content)
    if content.startswith("```"):
        content = content.split("```")[1]  # remove first ```
        content = content.replace("json", "", 1).strip()  # remove 'json' if present
    try:
        parsed = json.loads(content)
    except:
        parsed = {
            "score": None,
            "communication": content,
            "technical": "",
            "strengths": [],
            "weaknesses": [],
            "suggestions": []
        }
    print(parsed)

    return parsed
