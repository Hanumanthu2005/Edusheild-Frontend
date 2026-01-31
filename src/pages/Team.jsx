import "../css/Team.css";
import Navbar from "../components/Navbar";

function Team() {
  const teamMembers = [
    {
      name: "Team Member 1",
      role: "Backend Developer",
      photo: "/team/image.png"
    },
    {
      name: "Team Member 2",
      role: "Frontend Developer",
      photo: "/team/image.png"
    },
    {
      name: "Team Member 3",
      role: "Machine Learning Engineer",
      photo: "/team/image.png"
    },
    {
      name: "Team Member 4",
      role: "Project Coordinator",
      photo: "/team/image.png"
    }
  ];

  return (
    <>
      <Navbar />
      <section className="section team-section">
        <h2 className="section-title">Project Team</h2>

        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div className="team-card" key={index}>
              <img src={member.photo} alt={member.name} />
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default Team;
