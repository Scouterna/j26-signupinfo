import logging

from .scoutnet import CachedGroup, CachedProject, ProjectCache, ScoutnetProjectData

logger = logging.getLogger(__name__)


# --- Grouped project decoder (has group_member + group sections) ---


def _decode_project(project: ScoutnetProjectData) -> CachedProject:
    participants = {}
    questions = {}
    groups: dict[int, CachedGroup] = {}
    qdata = project.questions["questions"]
    sex_values = project.participants["labels"]["sex"]
    fee_values = project.participants["labels"]["project_fee"]
    grouped_project = bool("group_member" in project.questions["sections"])

    # Build section id -> title mapping for group_member sections
    sections = {s["id"]: s["title"] for qs in project.questions["sections"].values() for s in qs.values()}

    pdata = project.participants["participants"]
    logger.debug("Processing %s participants for project %s", len(pdata), project.project_name)

    for p in pdata.values():
        if not p["confirmed"]:
            continue  # Only handle confirmed participatns

        group_id = p["group_registration_info"]["group_id"] if grouped_project else 0

        # Add responder to participants list
        participants[p["member_no"]] = {
            "name": f"{p['first_name']} {p['last_name']}",
            "born": p["date_of_birth"],
            "registration_group": group_id,
            "member_group": p["primary_membership_info"]["group_id"] if p["primary_membership_info"] else group_id,
        }
        if p["date_of_birth"] < "2008-07-25":  # Over 18, also add contact info
            participants[p["member_no"]].update(
                {"email": p["primary_email"], "mobile": p["contact_info"].get("1") if p["contact_info"] else None}
            )

        # Create new group structure if group doesn't exist
        if group_id not in groups:
            groups[group_id] = CachedGroup(
                id=group_id,
                name=p["group_registration_info"]["group_name"] if grouped_project else project.project_name,
                aggregated={"Kön": {}, "Avgift": {}},
            )

        group = groups[group_id]
        group.num_participants += 1

        # Aggregate sex
        sex = sex_values[p["sex"]]
        if sex not in group.aggregated["Kön"]:
            group.aggregated["Kön"][sex] = 0
        group.aggregated["Kön"][sex] += 1

        # Aggregate fee values
        fee = fee_values.get(str(p["fee_id"]), "Okänd")  # Fee key is a string the values?
        if fee not in group.aggregated["Avgift"]:
            group.aggregated["Avgift"][fee] = 0
        group.aggregated["Avgift"][fee] += 1

        # Aggregate question responses
        if p["questions"]:
            group.individual_answers[p["member_no"]] = p["questions"]  # Store raw individual responses
            for qnum, qval in p["questions"].items():
                q = qdata[qnum]
                qnum = int(qnum)
                section_id = q["section_id"]

                # Save all questions separately
                if section_id not in questions:
                    questions[section_id] = {"text": sections[section_id], "questions": {}}
                secq = questions[section_id]["questions"]
                if qnum not in secq:
                    secq[qnum] = {"text": q["question"], "type": q["type"]}
                    if q["type"] == "choice":
                        secq[qnum]["choices"] = {c["value"]: c["option"] for c in q.get("choices", {}).values()}

                # Add response section to group
                if section_id not in group.aggregated:
                    group.aggregated[section_id] = {}
                group_section = group.aggregated[section_id]

                # Check question type and handle response accordingly
                if q["type"] == "boolean":
                    if q["choices"][qval]["option"] == "checked":
                        if qnum not in group_section:
                            group_section[qnum] = 0
                        group_section[qnum] += 1

                elif q["type"] == "choice":
                    if qnum not in group_section:
                        group_section[qnum] = {}
                    if type(qval) is not list:
                        qval = [qval]
                    for qsel in qval:
                        if qsel not in q["choices"]:
                            continue
                        if qsel not in group_section[qnum]:
                            group_section[qnum][qsel] = 0
                        group_section[qnum][qsel] += 1

                elif q["type"] == "text":
                    if (
                        sections[section_id] != "Hälsa"
                        and q["question"]
                        not in [
                            "Övriga önskemål på arbetsuppgifter",
                            "Önskemål om personer att jobba tillsammans med:",
                            "Om du har varit i kontakt med oss innan och förbokat vad du ska jobba med i Jamboreen, vem har du varit i kontakt med och inom vilket område ska du jobba?",
                            "Vad är namnet på den nationella scoutorganisation som du tillhör?",
                        ]
                        and qval
                        and qval.lower() not in ["no", "none", "n/a", "na", "n/a`", "ingen", "-"]
                    ):
                        if qnum not in group_section:
                            group_section[qnum] = []
                        group_section[qnum].append(qval)

                elif q["type"] == "number":
                    if qval:
                        if qnum not in group_section:
                            group_section[qnum] = 0
                        # if float(qval) > 100:
                        #     pass
                        group_section[qnum] += float(qval)

                elif q["type"] == "other_unsupported_by_api":
                    pass
                    # logger.info('Unhandled question "%s" of type: %s', qtext, q["type"])
                else:
                    logger.info("Unhandled question type: %s", q["type"])

    # Process group-level answers
    if grouped_project:
        gdata = project.groups
        logger.debug("Processing %s group responses for project %s", len(gdata), project.project_name)

        for gid_str, g in gdata.items():
            gid = int(gid_str)
            if gid not in groups:
                groups[gid] = CachedGroup(id=gid, name=g["name"])

            group = groups[gid]
            if g["questions"]:
                # Store raw group answers
                group.group_answers = g["questions"]

                # Also compute aggregated group-level answers
                for qnum, qval in g["questions"].items():
                    q = qdata[qnum]
                    # qtext = q["question"]

                    section_id = q["section_id"]
                    if section_id not in questions:
                        questions[section_id] = {"text": sections[section_id], "questions": {}}
                    secq = questions[section_id]["questions"]
                    if qnum not in secq:  # Save questions
                        secq[qnum] = {"text": q["question"], "type": q["type"]}
                        # if choices := q.get("choices"):
                        if q["type"] == "choice":
                            secq[qnum]["choices"] = {c["value"]: c["option"] for c in q.get("choices", {}).values()}

                    # section = sections[q["section_id"]]
                    if section_id not in group.aggregated:
                        group.aggregated[section_id] = {}
                    group_section = group.aggregated[section_id]

                    if q["type"] == "boolean":
                        group_section[qnum] = "Ja" if q["choices"][qval]["option"] == "checked" else "Nej"
                    elif q["type"] == "choice":
                        if qval not in q["choices"]:
                            continue
                        group_section[qnum] = q["choices"][qval]["option"]
                    elif q["type"] == "text":
                        group_section[qnum] = qval
                    else:
                        group_section[qnum] = qval

    # Resolve group contacts
    for g in groups.values():
        contact = g.aggregated.get("Ansvariga från kåren", {}).get("Ansvarig ledare på plats")
        if contact and int(contact) in participants:
            g.contact = participants[int(contact)]

    return CachedProject(
        project_id=project.project_id,
        project_name=project.project_name,
        participants=participants,
        questions=questions,
        groups=dict(sorted(groups.items())),
    )


# --- Main decoder ---


def scoutnet_forms_decoder(all_project_data: list[ScoutnetProjectData], cache: ProjectCache) -> None:
    projects: dict[int, CachedProject] = {}

    for project in all_project_data:
        projects[project.project_id] = _decode_project(project)
        cache.group_map |= {
            gid: g.name for gid, g in projects[project.project_id].groups.items()
        }  # Merge project group map with existing cache
        pass

    cache.projects = projects
    cache.mark_updated()
