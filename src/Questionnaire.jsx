import { useState } from "react";
import "./Questionnaire.css";

function Questionnaire({ onBack, onSubmit, initialData }) {
  const [form, setForm] = useState({
    name: "",
    gender: "",
    branch: "",
    year: "",
    district: "",
    sleep: "",
    cleanliness: "",
    noise: "",
    study: "",
    social: "",
    foodtype: "",
    sidepreference: "",
    futuretargets: "",
    mostimportanttrait: "",
    // Spread last, so any previously saved answers (when editing an
    // existing profile) override these blank defaults.
    ...initialData,
  });

  function update(field, value) {
    setForm({
      ...form,
      [field]: value,
    });
  }

  function handleSubmit() {
    console.log("Sending profile:", form);
    onSubmit(form);
  }

  return (
    <div className="questionnaire">

      <header className="questionnaire-header">

        <button
          className="back-home"
          onClick={onBack}
        >
          ← Back
        </button>

        <p className="tag">
          {initialData ? "EDIT PROFILE" : "ROOMMATE PROFILE"}
        </p>

        <h1>
          {initialData ? (
            <>
              Update your
              <br />
              <span>lifestyle answers.</span>
            </>
          ) : (
            <>
              Tell us about
              <br />
              <span>your lifestyle.</span>
            </>
          )}
        </h1>

        <p>
          Your answers help us find students
          with compatible roommate habits.
        </p>

      </header>


      <form onSubmit={handleSubmit}>

        <section className="form-section">

          <h2>Basic information</h2>

          <label>Your name</label>

          <input
            type="text"
            placeholder="Enter your name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />

          <label>Gender</label>

          <select
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
            required
          >
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
          </select>


          <label>Branch</label>

          <select
            value={form.branch}
            onChange={(e) => update("branch", e.target.value)}
            required
          >
            <option value="">Select branch</option>

            <option>Information Technology (IT)</option>
            <option>Computer Science & Engineering (CSE)</option>
            <option>
              Computer Science & Engineering – Cyber Security
            </option>
            <option>
              Electronics & Communication Engineering (ECE)
            </option>
            <option>Electrical Engineering (EE)</option>
            <option>Mechanical Engineering</option>
            <option>Civil Engineering</option>
            <option>Chemical Engineering</option>
            <option>Metallurgical Engineering</option>
            <option>Mining Engineering</option>
            <option>Production & Industrial Engineering</option>
          </select>


          <label>district</label>

          <select
            value={form.district}
            onChange={(e) => update("district", e.target.value)}
            required
          >
            <option value="">Select district</option>
                <option>Bokaro</option>
                <option>Chatra</option>
                <option>Deoghar</option>
                <option>Dhanbad</option>
                <option>Dumka</option>
                <option>East Singhbhum</option>
                <option>Garhwa</option>
                <option>Giridih</option>
                <option>Godda</option>
                <option>Gumla</option>
                <option>Hazaribagh</option>
                <option>Jamtara</option>
                <option>Khunti</option>
                <option>Koderma</option>
                <option>Latehar</option>
                <option>Lohardaga</option>
                <option>Pakur</option>
                <option>Palamu</option>
                <option>Ramgarh</option>
                <option>Ranchi</option>
                <option>Sahibganj</option>
                <option>Saraikela-Kharsawan</option>
                <option>Simdega</option>
                <option>West Singhbhum</option>
          </select>

        </section>


        <section className="form-section">

          <h2>Roommate preferences</h2>

          <Question
            title="What time do you usually sleep?"
            value={form.sleep}
            update={(value) => update("sleep", value)}
            options={[
              "Before 10 PM",
              "10 PM – 12 AM",
              "12 AM – 2 AM",
              "After 2 AM",
            ]}
          />


          <Question
            title="How clean do you like your room?"
            value={form.cleanliness}
            update={(value) => update("cleanliness", value)}
            options={[
              "Very clean",
              "Generally clean",
              "Some mess is fine",
              "Mess doesn't bother me",
            ]}
          />


          <Question
            title="How much noise can you tolerate?"
            value={form.noise}
            update={(value) => update("noise", value)}
            options={[
              "Very quiet",
              "Some noise is fine",
              "Noise doesn't bother me",
            ]}
          />


          <Question
            title="How do you prefer to study?"
            value={form.study}
            update={(value) => update("study", value)}
            options={[
              "Complete silence",
              "Some background noise",
              "People around are fine",
              "Mostly outside the room",
            ]}
          />


          <Question
            title="How social are you?"
            value={form.social}
            update={(value) => update("social", value)}
            options={[
              "Very private",
              "Somewhat private",
              "Balanced",
              "Very social",
            ]}
          />

          <Question
            title = "What is your food preference?"
            value={form.foodtype}
            update={(value) => update("foodtype", value)}
            options={[
              "Vegetarian",
              "Non-Vegetarian",
            ]}
          />  

          <Question
            title = "Side preference?"
            value={form.sidepreference}
            update = {(value) => update("sidepreference", value)}
            options={[
              "Gaming",
              "sports & fitness",
              "Music",
              "Reading",
            ]}
            />

            <Question
            title ="Future targets?"
            value={form.futuretargets}
            update = {(value) => update("futuretargets", value)}
            options={[
              "Higher Studies",
              "Job",
              "Just focus on CGPA",
            ]}
            />

            <Question
            title="Most Important trait you look for in a roommate?"
            value={form.mostimportanttrait}
            update = {(value) => update("mostimportanttrait", value)}
            options={[
              "respectful of privacy",
              "good communication",
              "similar study goals",
              "shared some sense of humour",
            ]}
            />

        </section>


       <button
          className="submit-button"
          type="button"
          onClick={handleSubmit}
        >
          {initialData ? "Save Changes →" : "Find My Matches →"}
        </button>
      </form>

    </div>
  );
}


function Question({
  title,
  options,
  value,
  update,
}) {
  return (
    <div className="question">

      <h3>{title}</h3>

      <div className="options">

        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={
              value === option
                ? "option selected"
                : "option"
            }
            onClick={() => update(option)}
          >
            {option}
          </button>
        ))}

      </div>

    </div>
  );
}

export default Questionnaire;