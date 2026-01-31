import "../css/Team.css";

function Team() {
  const teamMembers = [
    {
      name: "Team Member 1",
      role: "Backend Developer",
      photo: "/team/member1.jpg"
    },
    {
      name: "Team Member 2",
      role: "Frontend Developer",
      photo: "/team/member2.jpg"
    },
    {
      name: "Team Member 3",
      role: "Machine Learning Engineer",
      photo: "/team/member3.jpg"
    },
    {
      name: "Team Member 4",
      role: "Project Coordinator",
      photo: "/team/member4.jpg"
    }
  ];

  return (
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
  );
}

export default Team;
