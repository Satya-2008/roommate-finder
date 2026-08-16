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
    sidepreference: [],
    futuretargets: "",
    mostimportanttrait: [],
    specificPreference: "",
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

  // For multi-select questions — adds/removes an option from the
  // array instead of replacing a single value.
  function toggleMulti(field, option) {
    const current = form[field] || [];
    const updated = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    update(field, updated);
  }

  const [error, setError] = useState("");

  // The submit button is type="button" (not type="submit"), so the
  // `required` attributes on inputs/selects never actually trigger
  // browser validation — this function is the real gatekeeper.
  function validate() {
    const singleValueFields = [
      "name",
      "gender",
      "branch",
      "year",
      "district",
      "sleep",
      "cleanliness",
      "noise",
      "study",
      "social",
      "foodtype",
      "futuretargets",
    ];

    for (const field of singleValueFields) {
      const value = form[field];
      if (!value || value.toString().trim() === "") {
        return "Please answer every question before finding your matches.";
      }
    }

    if (!form.sidepreference || form.sidepreference.length === 0) {
      return "Please select at least one side preference.";
    }

    if (!form.mostimportanttrait || form.mostimportanttrait.length === 0) {
      return "Please select at least one important trait.";
    }

    return "";
  }

  function handleSubmit() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    console.log("Sending profile:", form);
    onSubmit(form);
  }

  return (
    <div className="questionnaire aurora-bg">

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


          <label>Year</label>

          <select
            value={form.year}
            onChange={(e) => update("year", e.target.value)}
            required
          >
            <option value="">Select year</option>
            <option>1st Year</option>
            <option>2nd Year</option>
            <option>3rd Year</option>
            <option>4th Year</option>
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

          <MultiQuestion
            title="Side preference? (select all that apply)"
            values={form.sidepreference || []}
            toggle={(option) => toggleMulti("sidepreference", option)}
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

          <MultiQuestion
            title="Most important traits you look for in a roommate? (select all that apply)"
            values={form.mostimportanttrait || []}
            toggle={(option) => toggleMulti("mostimportanttrait", option)}
            options={[
              "respectful of privacy",
              "good communication",
              "similar study goals",
              "shared some sense of humour",
            ]}
          />

          <div className="question">
            <h3>Anything specific you're looking for? (optional)</h3>
            <p className="question-hint">
              This is shown directly on your match cards — not used in
              scoring, just a way to flag a specific ask (e.g. "must be okay
              with a small pet", "looking for someone in the badminton
              club").
            </p>
            <textarea
              className="specific-preference-input"
              placeholder="e.g. Looking for someone who's also into badminton and doesn't mind an early alarm..."
              value={form.specificPreference}
              onChange={(e) => update("specificPreference", e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>

        </section>

        {error && <p className="form-error">{error}</p>}

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

// Same visual pattern as Question, but supports selecting more than
// one option at once — `values` is an array, `toggle` adds/removes.
function MultiQuestion({
  title,
  options,
  values,
  toggle,
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
              values.includes(option)
                ? "option selected"
                : "option"
            }
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}

      </div>

    </div>
  );
}

export default Questionnaire;