/*global tippy, luxon, numeral */
"use strict";
const DateTime = luxon.DateTime;

import { clip } from "./clip.js";

const truncate = clip;

const md = window.markdownit();

import PocketBase from "./pocketbase.es.mjs";

let client;

try {
	client = new PocketBase("https://backend.kyno.social");
} catch (error) {
	console.log(error);
	renderErrorPage("Failed to load client", "list");
}

// auth
if (client.authStore.isValid) {
	client.users.refresh();
	console.log(client.authStore.model);
}

function amountWeShouldTruncateContent() {
	let amt;
	if (document.body.clientWidth > 800) {
		amt = 110;
	} else if (document.body.clientWidth > 600) {
		amt = 100;
	} else {
		amt = 80;
	}
	return amt;
}

// utility functions
async function truncateText(text, length) {
	try {
		return truncate(text, length, { html: true, breakWords: true });
	} catch (error) {
		console.log(error);
		if (text.length > length) {
			return text.substring(0, length) + "...";
		} else {
			return text;
		}
	}
}



async function cleanText(text) {
	return text.replace(/(<([^>]+)>)/gi, "").trim();
}

async function getBadgeHTML(userObject, all = false) {
	let badgehtml = "";
	if (userObject.badges.length > 0) {
		for (let i = 0; i < userObject.badges.length; i++) {
			if (userObject.badges[i] == "bot") {
				badgehtml += `<i class="fa-solid fa-robot" data-tippy-content="Bot"></i> `;
			} else if (userObject.badges[i] == "dev") {
				badgehtml += `<i class="fa-solid fa-code" data-tippy-content="Developer"></i> `;
			} else if (userObject.badges[i] == "admin") {
				badgehtml += `<i class="fa-solid fa-user-cog" data-tippy-content="Administrator"></i> `;
			} else if (userObject.badges[i] == "mod") {
				badgehtml += `<i class="fa-solid fa-cogs" data-tippy-content="Moderator"></i> `;
			} else if (userObject.badges[i] == "verified") {
				badgehtml += `<i class="fa-solid fa-circle-check" data-tippy-content="Verified"></i> `;
			} else if (userObject.badges[i] == "bughunter") {
				badgehtml += `<i class="fa-solid fa-bug-slash" data-tippy-content="Bug Hunter"></i> `;
			} else if (userObject.badges[i] == "bloom") {
				badgehtml += `<i class="fa-solid fa-seedling" data-tippy-content="Bloom Subscriber"></i> `;
			} else if (userObject.badges[i] == "donut-giver") {
				badgehtml += `<i class="fa-solid fa-heart" data-tippy-content="Donut Giver"></i> `;
			} else {
				badgehtml += `<i class="fa-solid fa-question" data-tippy-content="Secret Badge"></i> `;
			}
			if (!all && i === 0) break;
		}
	}
	return badgehtml || "";
}

async function removeItemOnce(arr, value) {
	var index = arr.indexOf(value);
	if (index > -1) {
		arr.splice(index, 1);
	}
	return arr;
}

// render functions
async function renderHomePage(section = 1) {
	try {
		// fetch a paginated records list
		const resultList = await client.records.getList("posts", section, 10, {
			filter: 'created >= "2022-01-01 00:00:00"',
			sort: "-created,id",
			expand: "author,category",
		});

		const posts = resultList.items;

		// put all results into an html list

		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Recent";
		document.getElementById("document-title").innerHTML = "kynosocial - recent";
		for (let i = 0; i < posts.length; i++) {
			const post = posts[i];
			const postUser = post["@expand"].author;
			const postCategory = post["@expand"].category;
			let postUserName;
			if (postUser.name == undefined) {
				postUserName = "Anonymous";
			} else {
				postUserName = postUser.name;
			}
			const title = post.title;
			const content = post.content;
			const created = post.created;
			const updated = post.updated;
			const html = `
			<div class="post-item">
				<div class="post-image-wrapper">
					<div class="post-image">
						<a href="?page=user&user=${postUser.id}">
							<img loading="lazy" alt="${postUserName}'s profile picture" src="https://backend.kyno.social/api/files/systemprofiles0/${
				postUser.id
			}/${
				postUser.avatar
			}?thumb=128x128" width="64px" height="64px" onerror="this.src='https://avatars.dicebear.com/api/identicon/${
				postUser.id
			}.svg?colors[]=grey'">
						</a>
					</div>
					<div class="post-username">
						<a href="?page=user&user=${postUser.id}">${await cleanText(postUserName)}</a>
					</div>
				</div>
				<div class="post-content-wrapper">
					<div class="post-title">
						<a href="/?page=post&post=${post.id}">${await truncateText(
				await cleanText(title),
				32
			)}</a>
					</div>
					<div class="post-content">
						${await truncateText(
							await md.renderInline(await cleanText(content)),
							amountWeShouldTruncateContent()
						)}
					</div>
					<div class="post-created">
						${created} · <a href="?page=category&category=${postCategory.id}">#${
				postCategory.name
			}</a>
					</div>
				</div>
			</div>`;
			document.getElementById("list").innerHTML += html;
		}

		// render pagination with arrow buttons
		// only render up to 5 pages at a time, forwards and backwards
		if (resultList.totalPages > 1) {
			const pagination = document.getElementById("pagination");
			pagination.innerHTML = "";
			const page = resultList.page;
			const pages = resultList.totalPages;
			let look = 2;
			if (page <= look) {
				look = 5 - page;
			}
			if (page >= pages - (look - 1)) {
				look = 5 - (pages - page);
			}
			const start = Math.max(1, page - look);
			const end = Math.min(pages, page + look);
			if (page > 1) {
				pagination.innerHTML += `<a href="?page=home&section=${
					page - 1
				}"><i class="fa-solid fa-chevron-left"></i></a>`;
			}
			for (let i = start; i <= end; i++) {
				if (i == page) {
					pagination.innerHTML += `<a href="?page=home&section=${i}" class="active">${i}</a>`;
				} else {
					pagination.innerHTML += `<a href="?page=home&section=${i}">${i}</a>`;
				}
			}
			if (page < pages) {
				pagination.innerHTML += `<a href="?page=home&section=${
					page + 1
				}"><i class="fa-solid fa-chevron-right"></i></a>`;
			}
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load posts", "list");
	}
}

async function renderNotices() {
	try {
		// display a signin notice if username is anon
		if (client.authStore.isValid == false) {
			document.getElementById("list-notice").style.display = "flex";
			document.getElementById("list-notice-fieldset").style.display = "flex";
			document.getElementById("list-notice").innerHTML =
				'<p class="list-notice-text">You are currently <b class="purple-text">NOT</b> signed into the website. Please sign in to interact with the site.</p><div class="btns"><a href="?page=signup"><button class="btn-main">Register</button></a> <a href="?page=signin"><button class="btn-alt">Log In</button></a></div>';
		}
		// display a notice if the user is not verified using email
		else if (client.authStore.model.verified == false) {
			document.getElementById("list-notice").style.display = "flex";
			document.getElementById("list-notice-fieldset").style.display = "flex";
			document.getElementById("list-notice").innerHTML =
				'<p class="list-notice-text">Your email address is currently <b class="purple-text">NOT</b> verified. Please verify your email address to post.</p><div class="btns"><a href="?page=verify"><button class="btn-main">Send verification link</button></a></div>';
		}
		// get dynamic notices from the backend
		else {
			const rl = await client.records.getList("notices", 1, 50, {
				filter: 'created >= "2022-01-01 00:00:00"',
			});
			const notices = rl.items;
			if (notices.length > 0) {
				document.getElementById("list-notice").innerHTML = "";
				for (const notice of notices) {
					if (notice.active == true) {
						document.getElementById("list-notice").innerHTML += `
						<p class="list-notice-text"><strong>${await md.renderInline(
							await cleanText(notice.title)
						)}</strong><br>${await md.renderInline(
							await cleanText(notice.content)
						)}</p>`;
						document.getElementById("list-notice").style.display = "flex";
						document.getElementById("list-notice-fieldset").style.display =
							"flex";
					}
				}
			}
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load notices", "list-notice", false);
	}
}

async function renderNavbar() {
	try {
		// redirect id 'nav-profile-link' to signin page if not signed in
		if (
			client.authStore.isValid == false ||
			client.authStore.model == {} ||
			client.authStore.model == undefined ||
			client.authStore.model === null
		) {
			document.getElementById("nav-profile-link").href = "?page=signin";
			document.getElementById("nav-profile").innerHTML =
				'<i class="fa-solid fa-user-plus"></i>';
			document.getElementById("nav-add-post-link").href = "?page=signin";
		} else {
			document.getElementById("nav-profile-link").href =
				"?page=user&user=" + client.authStore.model.profile.id;
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load navbar", "list");
	}
}

async function renderPostPage() {
	try {
		const params = new Proxy(new URLSearchParams(window.location.search), {
			get: (searchParams, prop) => searchParams.get(prop),
		});
		const postId = params.post;
		const record = await client.records.getOne("posts", postId, {
			expand: "author,category",
		});

		// add one to the post's view count
		const data = {
			views: record.views + 1,
			title: record.title,
			content: record.content,
			category: record.category,
			author: record.author,
		};
		client.records.update("posts", postId, data);

		// put all results into an html list

		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Post";
		const post = record;
		const postUser = post["@expand"].author;
		const postCategory = post["@expand"].category;
		let postUserName;
		if (postUser.name == undefined) {
			postUserName = "Anonymous";
		} else {
			postUserName = postUser.name;
		}
		const title = post.title;
		document.getElementById("document-title").innerHTML =
			'kynosocial - "' + title + '"';
		const content = post.content;
		const created = post.created;
		const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img loading="lazy" alt="${postUserName}'s profile picture" src="https://backend.kyno.social/api/files/systemprofiles0/${
			postUser.id
		}/${
			postUser.avatar
		}?thumb=128x128" width="64px" height="64px" onerror="this.src='https://avatars.dicebear.com/api/identicon/${
			postUser.id
		}.svg?colors[]=grey'">
                    </a>
                </div>
                <div class="post-username">
                    <a href="?page=user&user=${postUser.id}">${await cleanText(
			postUserName
		)}</a>
                </div>
				<div class="post-views">
					<i class="fa-solid fa-eye views-icon"></i>${numeral(post.views).format("0a")}
				</div>
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    ${await cleanText(title)}
                </div>
                <div class="post-content">
                    ${await md.renderInline(await cleanText(content))}
                </div>
                <div class="post-created">
                    ${created} · <a href="?page=category&category=${
			postCategory.id
		}">#${postCategory.name}</a>
                </div>
            </div>
        </div>`;
		document.getElementById("list").innerHTML += html;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load post", "list");
	}
}

async function renderUserPage() {
	try {
		const params = new Proxy(new URLSearchParams(window.location.search), {
			get: (searchParams, prop) => searchParams.get(prop),
		});
		const userId = params.user;
		const user = await client.records.getOne("profiles", userId, {});
		let self;
		// get self if logged in
		client.users.refresh();
		if (client.authStore.isValid == true) {
			self = client.authStore.model.profile;
		}
		let userbio;
		if (user.bio == "") {
			userbio = "No biography found";
		} else {
			userbio = user.bio;
		}
		// compute badges
		const userBadgesIcons = await getBadgeHTML(user, true);
		// put all results into an html list
		document.getElementById("document-title").innerHTML =
			"kynosocial - " + user.name + "'s profile";
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "User";

		let followbutton = "";

		if (
			client.authStore.isValid == false ||
			user.id == client.authStore.model.profile.id
		) {
			followbutton = ``;
		} else {
			followbutton = `<a href="#"><button id="follow-${user.id}-btn" class="btn btn-main followbtn-small">Follow</button></a>`;
			// add event listener to follow button
		}

		// if already following, change button to unfollow
		if (client.authStore.isValid == true) {
			if (self.following.includes(user.id)) {
				followbutton = `<a href="#"><button id="follow-${user.id}-btn" class="btn btn-main followbtn-small">Unfollow</button></a>`;
			}
		}

		const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                        <img loading="lazy" alt="${
													user.name
												}'s profile picture" src="https://backend.kyno.social/api/files/systemprofiles0/${
			user.id
		}/${
			user.avatar
		}?thumb=128x128" width="64px" height="64px" onerror="this.src='https://avatars.dicebear.com/api/identicon/${
			user.id
		}.svg?colors[]=grey'">
                </div>
				<div class="post-username">
					${followbutton}
				</div>
                
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    ${await cleanText(user.name)} ${userBadgesIcons}
                </div>
                <div class="post-content">
                    ${await md.renderInline(await cleanText(userbio))}
                </div>
                <div class="post-created">
                    Created: ${user.created}
                </div>
            </div>
        </div>`;
		document.getElementById("list").innerHTML += html;

		if (client.authStore.isValid == true) {
			if (user.id != client.authStore.model.profile.id) {
				document
					.getElementById(`follow-${user.id}-btn`)
					.addEventListener("click", followUserManager);
			}
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load user page", "list");
	}
}

async function followUserManager(e) {
	try {
		const userID = e.target.id.split("-")[1];
		const user = await client.records.getOne("profiles", userID, {});
		const self = await client.records.getOne(
			"profiles",
			client.authStore.model.profile.id,
			{
				expand: "following",
			}
		);

		if (self.following.includes(userID) == false) {
			const follow = {
				following: await self.following.concat(user.id),
				badges: self.badges,
			};
			await client.records.update(
				"profiles",
				client.authStore.model.profile.id,
				follow
			);
			window.location.href = "?page=user&user=" + user.id;
		} else if (self.following.includes(userID) == true) {
			// calculate new following array
			const newFollowing = await removeItemOnce(self.following, userID);
			const follow = {
				following: newFollowing,
				badges: self.badges,
			};
			await client.records.update(
				"profiles",
				client.authStore.model.profile.id,
				follow
			);
			window.location.href = "?page=user&user=" + userID;
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to (un)follow user", "list");
	}
}

async function renderSigninPage() {
	try {
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Sign in";
		const html = `
		<div class="post-item">
		<form id="signin-form" action="?page=signin" method="post">
			<div class="form-group">
				<label for="email">Email:</label>
				<input type="email" class="form-control" id="email" name="email" placeholder="Email...">
			</div>
			<div class="form-group">
				<label for="password">Password:</label>
				<input type="password" class="form-control" id="password" name="password" placeholder="Password...">
			</div>
			<button type="submit" class="btn btn-main">Sign in</button>
			<p style="font-size:0.8rem;margin-bottom:0;text-align:center;width:100%;">Don't have an account? <button type="button" class="btn btn-main" onclick="window.location.href='?page=signup'">Sign up</button></p>
		</form>
		</div>
		`;
		document.getElementById("list").innerHTML += html;
		var form = document.getElementById("signin-form");
		if (form.attachEvent) {
			form.attachEvent("submit", signinFromForm);
		} else {
			form.addEventListener("submit", signinFromForm);
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load signin page", "list");
	}
}

async function signinFromForm(e) {
	try {
		e.preventDefault();
		const form = e.target;
		const email = form.email.value;
		const password = form.password.value;

		client.authStore.clear();
		await client.users.authViaEmail(email, password);
		window.location.href = "/";
		return false;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to signin", "list");
	}
}
async function renderSignupPage() {
	try {
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Sign up";
		const html = `
		<div class="post-item">
		<form id="signup-form" action="?page=signup" method="post">
			<div class="form-group" id="signup-email-group">
				<label for="email">E-Mail:</label>
				<input type="email" class="form-control" id="email" name="email" placeholder="E-Mail" required>
			</div>
			<div class="form-group" id="signup-username-group">
				<label for="email">Username:</label>
				<input type="username" class="form-control" id="username" name="username" placeholder="Username" required>
			</div>
			<div class="form-group" id="signup-password-group">
				<label for="password">Password:</label>
				<input type="password" class="form-control" id="password" name="password" placeholder="Password" required>
			</div>
			<div class="form-group" id="signup-confirmpassword-group">
				<label for="password">Confirm Password:</label>
				<input type="password" class="form-control" id="confirmpassword" name="confirm-password" placeholder="Confirm Password" required>
			</div>
			<button type="submit" class="btn btn-main">Sign up</button>
			<p style="font-size:0.8rem;margin-bottom:0;text-align:center;width:100%;">Already have an account? <button type="button" class="btn btn-main" onclick="window.location.href='?page=signin'">Sign in</button></p>
		</form>
		</div>
		`;
		document.getElementById("list").innerHTML += html;
		var form = document.getElementById("signup-form");
		if (form.attachEvent) {
			form.attachEvent("submit", signupFromForm);
		} else {
			form.addEventListener("submit", signupFromForm);
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load signup page", "list");
	}
}

async function signupFromForm(e) {
	try {
		e.preventDefault();

		const form = e.target;
		const email = form.email.value;
		const password = form.password.value;
		const confirmPassword = form.confirmpassword.value;
		const username = form.username.value;

		// handle wrong input

		if (email == "") {
			renderErrorMessage("Please fill in all fields", "signup-email-group");
			return false;
		}
		if (password == "") {
			renderErrorMessage("Please fill in all fields", "signup-password-group");
			return false;
		}
		if (confirmPassword == "") {
			renderErrorMessage(
				"Please fill in all fields",
				"signup-confirmpassword-group"
			);
			return false;
		}
		if (username == "") {
			renderErrorMessage("Please fill in all fields", "signup-username-group");
			return false;
		}

		if (
			email
				.toLowerCase()
				.match(
					/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
				) == false
		) {
			renderErrorMessage("Please enter a valid email", "signup-email-group");
			return false;
		}

		if (password != confirmPassword) {
			renderErrorMessage(
				"Passwords do not match",
				"signup-confirmpassword-group"
			);
			return false;
		}
		if (password.length < 10) {
			renderErrorMessage(
				"Password must be at least 10 characters long",
				"signup-password-group"
			);
			return false;
		}
		if (username.length < 3) {
			renderErrorPage(
				"Username must be at least 3 characters long",
				"signup-username-group"
			);
			return false;
		}
		if (username.length > 20) {
			renderErrorPage(
				"Username must be at most 20 characters long",
				"signup-username-group"
			);
			return false;
		}

		const createdUser = await client.users.create({
			email: email,
			password: password,
			passwordConfirm: confirmPassword,
		});

		await client.users.authViaEmail(email, password);
		await client.users.refresh();
		await client.records.update("profiles", createdUser.profile.id, {
			name: username,
			badges: createdUser.profile.badges,
		});
		window.location.href = "/";
		return false;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to signup", "list");
	}
}

function renderErrorMessage(message, element) {
	const messageId = message.replace(/\s/g, "");
	let errorCounter = window.localStorage.getItem(messageId);
	if (errorCounter === null) {
		window.localStorage.setItem(messageId, 1);
		errorCounter = "1";
	} else {
		window.localStorage.setItem(messageId, parseInt(errorCounter) + 1);
	}

	const html = `
	<div class="alert-item" id="${messageId}">
		<div class="alert alert-danger" role="alert" style="color:red;margin:0;font-size:0.8rem;">
			${message} (${errorCounter})
		</div>
	</div>
	`;

	if (
		document
			.getElementById(element)
			.contains(document.getElementById(messageId)) == false
	) {
		document.getElementById(element).innerHTML += html;
	} else {
		document.getElementById(messageId).innerHTML = `
		<div class="alert alert-danger" role="alert" style="color:red;margin:0;font-size:0.8rem;">
			${message} (${errorCounter})
		</div>
		`;
	}
}

async function renderSignoutPage() {
	client.authStore.clear();
	window.location.href = "/";
}

async function renderTrendingPage(section = 1) {
	try {
		// only show posts from the last week
		const resultList = await client.records.getList("posts", section, 10, {
			filter:
				'created >= "' +
				DateTime.now()
					.setZone("Etc/UTC")
					.minus({ weeks: 1 })
					.endOf("day")
					.toISO() +
				'"',
			sort: "-views,-created",
			expand: "author,category",
		});

		const posts = resultList.items;

		// put all results into an html list

		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Trending";
		document.getElementById("document-title").innerHTML =
			"kynosocial - trending";
		if (resultList.totalItems > 0) {
			for (let i = 0; i < posts.length; i++) {
				const post = posts[i];
				const postUser = post["@expand"].author;
				const postCategory = post["@expand"].category;
				let postUserName;
				if (postUser.name == undefined) {
					postUserName = "Anonymous";
				} else {
					postUserName = postUser.name;
				}
				const title = post.title;
				const content = post.content;
				const created = post.created;
				const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img loading="lazy" alt="${postUserName}'s profile picture" src="https://backend.kyno.social/api/files/systemprofiles0/${
					postUser.id
				}/${
					postUser.avatar
				}?thumb=128x128" width="64px" height="64px" onerror="this.src='https://avatars.dicebear.com/api/identicon/${
					postUser.id
				}.svg?colors[]=grey'">
                    </a>
                </div>
                <div class="post-username">
                    <a href="?page=user&user=${postUser.id}">${postUserName}</a>
                </div>
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    <a href="/?page=post&post=${post.id}">${await truncateText(
					await cleanText(title),
					32
				)}</a>
                </div>
                <div class="post-content">
                    ${await truncateText(
											await md.renderInline(await cleanText(content)),
											amountWeShouldTruncateContent()
										)}
                </div>
                <div class="post-created">
                    ${created} · <a href="?page=category&category=${
					postCategory.id
				}">#${postCategory.name}</a>
                </div>
            </div>
        </div>`;
				document.getElementById("list").innerHTML += html;
			}

			// render pagination with arrow buttons
			// only render up to 5 pages, the current page, and the 2 pages before and after it
			if (resultList.totalPages > 1) {
				const pagination = document.getElementById("pagination");
				pagination.innerHTML = "";
				const page = resultList.page;
				const pages = resultList.totalPages;
				let look = 2;
				if (page <= look) {
					look = 5 - page;
				}
				if (page >= pages - (look - 1)) {
					look = 5 - (pages - page);
				}
				const start = Math.max(1, page - look);
				const end = Math.min(pages, page + look);
				if (page > 1) {
					pagination.innerHTML += `<a href="?page=trending&section=${
						page - 1
					}"><i class="fa-solid fa-chevron-left"></i></a>`;
				}
				for (let i = start; i <= end; i++) {
					if (i == page) {
						pagination.innerHTML += `<a href="?page=trending&section=${i}" class="active">${i}</a>`;
					} else {
						pagination.innerHTML += `<a href="?page=trending&section=${i}">${i}</a>`;
					}
				}
				if (page < pages) {
					pagination.innerHTML += `<a href="?page=trending&section=${
						page + 1
					}"><i class="fa-solid fa-chevron-right"></i></a>`;
				}
			}
		} else {
			document.getElementById("list").innerHTML = `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
						<i class="fa-solid fa-arrow-trend-up"></i> No trending posts right now.
					</div>
				</div>
			</div>
			`;
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load trending page", "list");
	}
}

async function renderCategoriesPage(section) {
	try {
		const resultList = await client.records.getList("categories", section, 10, {
			sort: "name",
		});

		const categories = resultList.items;

		// put all results into an html list
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Categories";
		document.getElementById("document-title").innerHTML =
			"kynosocial - categories";
		for (let i = 0; i < categories.length; i++) {
			const category = categories[i];
			const categoryName = category.name;
			const categoryDescription = category.description;

			const html = `
		<div class="post-item">
			<div class="post-content-wrapper">
				<div class="post-title">
					<a href="?page=category&category=${category.id}">#${categoryName}</a>
				</div>
				<div class="post-content">
					${categoryDescription}
				</div>
				<div class="post-created">
					${category.created}
				</div>
			</div>
		</div>`;
			document.getElementById("list").innerHTML += html;
		}
		// render pagination with arrow buttons
		// only render up to 5 pages, the current page, and the 2 pages before and after it
		if (resultList.totalPages > 1) {
			const pagination = document.getElementById("pagination");
			pagination.innerHTML = "";
			const page = resultList.page;
			const pages = resultList.totalPages;
			let look = 2;
			if (page <= look) {
				look = 5 - page;
			}
			if (page >= pages - (look - 1)) {
				look = 5 - (pages - page);
			}
			const start = Math.max(1, page - look);
			const end = Math.min(pages, page + look);
			if (page > 1) {
				pagination.innerHTML += `<a href="?page=categories&section=${
					page - 1
				}"><i class="fa-solid fa-chevron-left"></i></a>`;
			}
			for (let i = start; i <= end; i++) {
				if (i == page) {
					pagination.innerHTML += `<a href="?page=categories&section=${i}" class="active">${i}</a>`;
				} else {
					pagination.innerHTML += `<a href="?page=categories&section=${i}">${i}</a>`;
				}
			}
			if (page < pages) {
				pagination.innerHTML += `<a href="?page=categories&section=${
					page + 1
				}"><i class="fa-solid fa-chevron-right"></i></a>`;
			}
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load categories page", "list");
	}
}

async function renderCategoryPage(categoryId, section) {
	try {
		const category = await client.records.getOne("categories", categoryId);
		const resultList = await client.records.getList("posts", section, 10, {
			filter: 'category.id = "' + categoryId + '"',
			sort: "-views,-created",
			expand: "author",
		});

		const posts = resultList.items;

		// put all results into an html list
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "#" + category.name;
		document.getElementById("document-title").innerHTML =
			"kynosocial - #" + category.name;

		if (resultList.totalItems > 0) {
			for (let i = 0; i < posts.length; i++) {
				const post = posts[i];
				const postUser = post["@expand"].author;
				let postUserName;
				if (postUser.name == undefined) {
					postUserName = "Anonymous";
				} else {
					postUserName = postUser.name;
				}
				const title = post.title;
				const content = post.content;
				const created = post.created;
				const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img loading="lazy" alt="${postUserName}'s profile picture" src="https://backend.kyno.social/api/files/systemprofiles0/${
					postUser.id
				}/${
					postUser.avatar
				}?thumb=128x128" width="64px" height="64px" onerror="this.src='https://avatars.dicebear.com/api/identicon/${
					postUser.id
				}.svg?colors[]=grey'">
                    </a>
                </div>
                <div class="post-username">
                    <a href="?page=user&user=${postUser.id}">${postUserName}</a>
                </div>
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    <a href="/?page=post&post=${post.id}">${await truncateText(
					title,
					32
				)}</a>
                </div>
                <div class="post-content">
                    ${await truncateText(
											await md.renderInline(await cleanText(content)),
											amountWeShouldTruncateContent()
										)}
                </div>
                <div class="post-created">
                    ${created}
                </div>
            </div>
        </div>`;
				document.getElementById("list").innerHTML += html;
			}

			// render pagination with arrow buttons
			// only render up to 5 pages, the current page, and the 2 pages before and after it
			if (resultList.totalPages > 1) {
				const pagination = document.getElementById("pagination");
				pagination.innerHTML = "";
				const page = resultList.page;
				const pages = resultList.totalPages;
				let look = 2;
				if (page <= look) {
					look = 5 - page;
				}
				if (page >= pages - (look - 1)) {
					look = 5 - (pages - page);
				}
				const start = Math.max(1, page - look);
				const end = Math.min(pages, page + look);
				if (page > 1) {
					pagination.innerHTML += `<a href="?page=category&category=${categoryId}&section=${
						page - 1
					}"><i class="fa-solid fa-chevron-left"></i></a>`;
				}
				for (let i = start; i <= end; i++) {
					if (i == page) {
						pagination.innerHTML += `<a href="?page=category&category=${categoryId}&section=${i}" class="active">${i}</a>`;
					} else {
						pagination.innerHTML += `<a href="?page=category&category=${categoryId}&section=${i}">${i}</a>`;
					}
				}
				if (page < pages) {
					pagination.innerHTML += `<a href="?page=category&category=${categoryId}&section=${
						page + 1
					}"><i class="fa-solid fa-chevron-right"></i></a>`;
				}
			}
		} else {
			document.getElementById("list").innerHTML = `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
						<i class="fa-solid fa-message"></i> No posts in this category yet.
					</div>
				</div>
			</div>
			`;
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load category page", "list");
	}
}

async function renderAddPostPage() {
	try {
		// get popular categories
		const categoryResultList = await client.records.getList(
			"categories",
			1,
			100,
			{
				sort: "name",
			}
		);

		// render the add post page
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Add Post";
		document.getElementById("document-title").innerHTML =
			"kynosocial - add post";
		const html = `
		<div class="post-item">
			<div class="post-content-wrapper">
				<div class="post-content">
					<form id="add-post-form" action="?page=addpost" method="post">
						<div class="form-group" id="posttitlegroup">
							<label for="title">Title</label>
							<input type="text" class="form-control" id="posttitle" name="title" placeholder="Title">
						</div>
						<div class="form-group" id="postcontentgroup">
							<label for="content">Content</label>
							<textarea style="resize:none;height:5rem;" class="form-control" id="postcontent" name="content" rows="3" placeholder="Remember, be nice!"></textarea>
						</div>
						<div class="form-group" id="postcategorygroup">
							<label for="category">Category</label>
							<select class="form-control" id="postcategory" name="category">
								${categoryResultList.items
									.map((category) => {
										if (category.name == "general") {
											return `<option value="${category.id}" selected>${category.name}</option>`;
										} else {
											return `<option value="${category.id}">${category.name}</option>`;
										}
									})
									.join("")}
							</select>
						</div>
						<button type="submit" class="btn btn-main">Add Post</button>
						<span id="add-post-error" class="error"></span>
					</form>
				</div>
			</div>
		</div>`;
		document.getElementById("list").innerHTML = html;

		// add event listener to the form
		var form = document.getElementById("add-post-form");
		if (form.attachEvent) {
			form.attachEvent("submit", addPostFromForm);
		} else {
			form.addEventListener("submit", addPostFromForm);
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load post page", "list");
	}
}

async function addPostFromForm(e) {
	try {
		e.preventDefault();
		await client.users.refresh();
		const form = e.target;
		const title = form.posttitle.value;
		const content = form.postcontent.value;
		const categoryId = form.postcategory.value;
		const category = await client.records.getOne("categories", categoryId);
		const user = await client.records.getOne(
			"profiles",
			client.authStore.model.profile.id
		);
		// verify the form
		if (client.authStore.model.verified == false) {
			renderErrorMessage(
				"You must verify your email before posting.",
				"add-post-error"
			);
			return;
		}
		if (title == "") {
			renderErrorMessage("Please fill in all fields", "posttitlegroup");
			return;
		}
		if (content == "") {
			renderErrorMessage("Please fill in all fields", "postcontentgroup");
			return;
		}
		if (category === null) {
			renderErrorMessage("Please select a category", "postcategorygroup");
			return;
		}

		const post = await client.records.create("posts", {
			title: title,
			content: content,
			category: category.id,
			author: user.id,
		});
		window.location.href = "?page=post&post=" + post.id;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to add post", "list");
	}
}

async function renderErrorPage(err, div, showgif = true) {
	if (err === null) {
		err = "An unknown error has occurred";
	}
	if (div === null) {
		div = "list";
	}
	document.getElementById(div).style.display = "flex";
	document.getElementById(`${div}-fieldset`).style.display = "flex";
	// document.getElementById(`${div}-legend`).innerHTML = "Error";
	let img;
	if (showgif) {
		img =
			'<img alt="Funny GIF of man smashing computer" src="img/error.gif" width="100%">';
	} else {
		img = "";
	}
	document.getElementById(
		div
	).innerHTML = `${img}<p><i class="fa-solid fa-bug"></i> An error has occurred.</p><span class="post-created">(${err})</span>`;
}

async function renderComments(
	isUserPageComment = false,
	ID = null,
	section = 1
) {
	try {
		let resultList;
		if (isUserPageComment == false) {
			resultList = await client.records.getList("post_comments", section, 10, {
				filter:
					'created >= "2022-01-01 00:00:00" && linked_post.id = "' + ID + '"',
				sort: "-created,id",
				expand: "author",
			});
		} else {
			resultList = await client.records.getList("user_comments", section, 10, {
				filter:
					'created >= "2022-01-01 00:00:00" && linked_profile.id = "' +
					ID +
					'"',
				sort: "-created,id",
				expand: "author",
			});
		}
		document.getElementById("comments").style.display = "flex";
		document.getElementById("comments-fieldset").style.display = "flex";
		document.getElementById("comments").innerHTML = "";
		document.getElementById("comments-legend").innerHTML = "Comments";
		const comments = resultList.items;

		let hiddenformvalue;
		if (isUserPageComment) {
			hiddenformvalue = `<input type='hidden' name='isUserPageComment' value=true>
			<input type='hidden' name='linkedID' value=${ID}>`;
		} else {
			hiddenformvalue = `<input type='hidden' name='isUserPageComment' value=false>
			<input type='hidden' name='linkedID' value=${ID}>`;
		}

		const addcommentformhtml = `
		<div class="post-item">
			<div class="post-content-wrapper">
				<div class="post-content">
					<form id="comment-form" action="#" method="post">
						<div class="form-group">
							<textarea class="comment-ta" class="form-control" id="comment" name="comment" placeholder="Add a comment..." ></textarea>
							${hiddenformvalue}
						</div>
						<button type="submit" class="btn btn-main">Comment</button>
					</form>
				</div>
			</div>
		</div>
		`;

		if (resultList.totalItems > 0) {
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
				const author = comment["@expand"].author;
				// compute badges
				const userBadgesIcons = await getBadgeHTML(author);
				const html = `
				<div class="post-item">
					<div class="post-image-wrapper">
						<div class="post-image">
							<a href="?page=user&user=${author.id}">
								<img loading="lazy" alt="${
									author.name
								}'s profile picture" src="https://backend.kyno.social/api/files/systemprofiles0/${
					author.id
				}/${
					author.avatar
				}?thumb=128x128" width="64px" height="64px" onerror="this.src='https://avatars.dicebear.com/api/identicon/${
					author.id
				}.svg?colors[]=grey'">
							</a>
						</div>
						
					</div>
					<div class="post-content-wrapper">
						<div class="post-title">
							<a href="/?page=user&user=${author.id}">${author.name}</a> ${userBadgesIcons}
						</div>
						<div class="post-content">
							${await md.renderInline(await cleanText(comment.content))}
						</div>
						<div class="post-created">
							${comment.created}
						</div>
					</div>
				</div>`;
				document.getElementById("comments").innerHTML += html;
			}

			// render pagination with arrow buttons
			// only render up to 5 pages, the current page, and the 2 pages before and after it
			if (resultList.totalPages > 1) {
				const pagination = document.getElementById("comments-pagination");
				pagination.innerHTML = "";
				const type = isUserPageComment ? "user" : "post";
				const page = resultList.page;
				const pages = resultList.totalPages;
				let look = 2;
				if (page <= look) {
					look = 5 - page;
				}
				if (page >= pages - (look - 1)) {
					look = 5 - (pages - page);
				}
				const start = Math.max(1, page - look);
				const end = Math.min(pages, page + look);
				if (page > 1) {
					pagination.innerHTML += `<a href="?page=${type}&${type}=${ID}&commentsection=${
						page - 1
					}"><i class="fa-solid fa-chevron-left"></i></a>`;
				}
				for (let i = start; i <= end; i++) {
					if (i == page) {
						pagination.innerHTML += `<a href="?page=${type}&${type}=${ID}&commentsection=${i}" class="active">${i}</a>`;
					} else {
						pagination.innerHTML += `<a href="?page=${type}&${type}=${ID}&commentsection=${i}">${i}</a>`;
					}
				}
				if (page < pages) {
					pagination.innerHTML += `<a href="?page=${type}&${type}=${ID}&commentsection=${
						page + 1
					}"><i class="fa-solid fa-chevron-right"></i></a>`;
				}
			}
		} else {
			document.getElementById("comments").innerHTML += `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
						<i class="fa-solid fa-comment-dots"></i> No comments yet.
					</div>
				</div>
			</div>
			`;
		}
		if (client.authStore.isValid) {
			document.getElementById("comments").innerHTML =
				addcommentformhtml + document.getElementById("comments").innerHTML;
			var form = document.getElementById("comment-form");
			if (form.attachEvent) {
				form.attachEvent("submit", commentFromForm);
			} else {
				form.addEventListener("submit", commentFromForm);
			}
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load comments", "comments");
	}
}

async function commentFromForm(e) {
	try {
		e.preventDefault();
		const form = e.target;
		const comment = form.comment.value;

		if (comment == "") {
			return;
		}
		const linkedID = form.linkedID.value;
		const isUserPageComment = form.isUserPageComment.value;
		if (isUserPageComment == "true") {
			await client.records.create("user_comments", {
				content: await cleanText(comment),
				author: client.authStore.model.profile.id,
				linked_profile: linkedID,
			});
			form.reset();
			window.location.href = "?page=user&user=" + linkedID;
			return false;
		} else {
			await client.records.create("post_comments", {
				content: await cleanText(comment),
				author: client.authStore.model.profile.id,
				linked_post: linkedID,
			});
			form.reset();
			window.location.href = "?page=post&post=" + linkedID;
			return false;
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to comment", "comments");
	}
}

async function getThemeSelectorHTML() {
	try {
		// Theme files are stored in the /css/themes folder
		const themes = [
			"modern",
			"retro",
			"hyper",
			"modern, blue",
			"modern, green",
			"modern, yellow",
			"modern, purple",
		];
		let html = "";
		for (let i = 0; i < themes.length; i++) {
			const theme = themes[i];
			html += `<option value="${theme}" ${
				localStorage.getItem("theme") == theme ? "selected" : ""
			}>${theme}</option>`;
		}

		return html;
	} catch (error) {
		console.log(error);
	}
}

async function renderManageProfile(userID) {
	try {
		if (
			client.authStore.isValid == true &&
			client.authStore.model.profile.id == userID
		) {
			const user = await client.records.getOne(
				"profiles",
				client.authStore.model.profile.id
			);
			document.getElementById("settings").style.display = "flex";
			document.getElementById("settings-fieldset").style.display = "flex";
			document.getElementById("settings").innerHTML = "";
			document.getElementById("settings-legend").innerHTML = "Settings";
			const html = `
					<div class="post-item">
						<div class="post-content-wrapper">
							<div class="post-content" id="edit-avatar">
								<i class="fa-solid fa-user-edit"></i> Edit Avatar
								<form class="form-generic" id="editavatar-form" action="?page=settings" method="post" enctype="multipart/form-data">
									<input type="file" name="avatar" id="avatar" accept="image/*">
									<input type="submit" class="upload-i" id="avatarupload" value="Save Avatar" class="btn btn-main">
								</form>
							</div>	
						</div>	
					</div>
					<div class="post-item">
						<div class="post-content-wrapper">
							<div class="post-content" id="edit-bio">
							<i class="fa-solid fa-book"></i> Edit Bio
								<form class="form-generic" id="editbio-form" action="?page=settings" method="post" enctype="multipart/form-data">
									<textarea name="bio" id="bio" maxlength="250">${user.bio}</textarea>
									<input type="submit" class="upload-i" value="Save Bio" class="btn btn-main">
								</form>
							</div>	
						</div>	
					</div>
					<div class="post-item">
						<div class="post-content-wrapper">
							<div class="post-content" id="edit-bio">
							<i class="fa-solid fa-book"></i> Edit Theme
								<form class="form-generic" id="edittheme-form" action="?page=settings" method="post" enctype="multipart/form-data">
									<select name="theme" id="theme">
									${await getThemeSelectorHTML()}
									</select>
									<input type="submit" class="upload-i" value="Save Theme" class="btn btn-main">
								</form>
							</div>	
						</div>	
					</div>
					<div class="post-item">
						<div class="post-content-wrapper">
							<div class="post-content">
							<a href="?page=signout" id="signoutlink"><i class="fa-solid fa-right-from-bracket"></i> Sign out</a>
							</div>	
						</div>	
					</div>
				`;
			document.getElementById("settings").innerHTML += html;
			// add event listener to edit avatar form
			var form = document.getElementById("editavatar-form");
			if (form.attachEvent) {
				form.attachEvent("submit", editAvatarFromForm);
			} else {
				form.addEventListener("submit", editAvatarFromForm);
			}
			// add event listener to edit bio form
			var form1 = document.getElementById("editbio-form");
			if (form1.attachEvent) {
				form1.attachEvent("submit", editBioFromForm);
			} else {
				form1.addEventListener("submit", editBioFromForm);
			}
			// add event listener to edit theme form
			var form2 = document.getElementById("edittheme-form");
			if (form2.attachEvent) {
				form2.attachEvent("submit", editThemeFromForm);
			} else {
				form2.addEventListener("submit", editThemeFromForm);
			}
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load manage profile", "settings");
	}
}

async function editAvatarFromForm(e) {
	try {
		e.preventDefault();
		const button = document.getElementById("avatarupload");
		button.disabled = true;
		button.value = "Uploading...";
		const form = e.target;
		const avatar = form.avatar.files[0];
		if (avatar == undefined) {
			window.location.href =
				"/?page=user&user=" + client.authStore.model.profile.id;
		}

		await client.users.refresh();
		const formData = new FormData();
		formData.append("avatar", avatar);
		const result = await client.records.update(
			"profiles",
			client.authStore.model.profile.id,
			formData
		);

		form.reset();
		window.location.href =
			"/?page=user&user=" + client.authStore.model.profile.id;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to upload avatar", "settings");
	}
}

async function editBioFromForm(e) {
	try {
		e.preventDefault();
		const form = e.target;
		const bio = form.bio.value;
		if (bio == undefined) {
			return;
		}
		await client.records.update("profiles", client.authStore.model.profile.id, {
			bio: bio,
		});
		form.reset();
		window.location.href =
			"/?page=user&user=" + client.authStore.model.profile.id;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to edit bio", "settings");
	}
}

async function editThemeFromForm(e) {
	try {
		e.preventDefault();
		const form = e.target;
		const theme = form.theme.value;
		if (theme == undefined) {
			return;
		}
		localStorage.setItem("theme", theme);
		form.reset();
		window.location.href =
			"/?page=user&user=" + client.authStore.model.profile.id;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to edit theme", "settings");
	}
}

async function sendVerificationEmail() {
	await client.users.refresh();
	try {
		// check if user is logged in
		if (client.authStore.isValid == false) {
			window.location.href = "/?page=signin";
			return;
		}
		if (client.authStore.model.verified) {
			window.location.href = `/?page=user&user=${client.authStore.model.profile.id}`;
			return;
		}
		// show success message
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Email Verification";
		document.getElementById("document-title").innerHTML = "kynosocial - verify";
		document.getElementById("list").innerHTML = `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
						<i class="fa-solid fa-envelope"></i> Verification email sent!
					</div>
				</div>
			</div>
		`;
		// send verification email
		await client.users.requestVerification(client.authStore.model.email);
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to send verification email", "settings");
	}
}

function renderEULAPage() {
	try {
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "EULA";
		document.getElementById("document-title").innerHTML = "kynosocial - eula";
		document.getElementById("list").innerHTML = `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
						<h2>Kynosocial End User License Agreement</h2>

					<p>This End User License Agreement ("Agreement") is a legal agreement between you and Kynosocial's lead developer BlueSkye ("Kynosocial"). By using the Kynosocial website, mobile application or other services (the "Service"), you agree to be bound by the terms and conditions of this Agreement. If you do not agree to the terms of this Agreement, do not use the Service.</p>
					
					<p>Kynosocial reserves the right to modify this Agreement at any time, and such modifications shall be effective immediately upon posting of the modified Agreement. You agree to review this Agreement periodically to be aware of such modifications, and your continued access or use of the Service shall be deemed your conclusive acceptance of the modified Agreement.</p>
					
					<h3>A1. License</h3>
					
					<p>Subject to the terms and conditions of this Agreement, Kynosocial hereby grants you a limited, revocable, non-exclusive, non-transferable license to access and use the Service.</p>
					
					<h3>A2. Eligibility</h3>
					
					<p>You must be at least 13 years of age to use the Service. By using the Service, you represent and warrant that you are at least 13 years of age and that you have the right, authority and capacity to enter into this Agreement and to abide by all of the terms and conditions of this Agreement. If you are under the age of 13, you may not use the Service.</p>
					
					<h3>A3. Prohibited Uses</h3>
					
					<p>The Service is for personal use only. You may not use the Service for any commercial purpose whatsoever, including, but not limited to, raising money, advertising or promoting a product, service or brand.</p>
					
					<p>You agree not to use the Service to:<p>
					<ul>
					<li>Post any content that is illegal, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically or otherwise objectionable;</li>
					
					<li>Post any content that you do not have a right to post under any law or under contractual or fiduciary relationships (such as inside information, proprietary and confidential information learned or disclosed as part of employment relationships or under nondisclosure agreements);</li>
					
					<li>Post any content that infringes any patent, trademark, trade secret, copyright or other proprietary rights of any party;</li>
					
					<li>Post any unsolicited or unauthorized advertising, promotional materials, "junk mail," "spam," "chain letters," "pyramid schemes," or any other form of solicitation;</li>
					
					<li>Post any content that contains software viruses or any other computer code, files or programs designed to interrupt, destroy or limit the functionality of any computer software or hardware or telecommunications equipment;</li>
					
					<li>Interfere with or disrupt the Service or servers or networks connected to the Service, or disobey any requirements, procedures, policies or regulations of networks connected to the Service;</li>
					
					<li>Intentionally or unintentionally violate any applicable local, state, national or international law;</li>
					
					<li>"Stalk" or otherwise harass another user of the Service; or</li>
					
					<li>Collect or store personal data about other users of the Service.</li>
					</ul>
					
					<h3>A4. User Content</h3>
					
					<p>"User Content" means any and all content that you post on the Service, including, but not limited to, text, photos, videos, comments, and any other materials.</p>
					
					<p>You retain all ownership rights of your User Content. However, by posting your User Content on the Service, you grant Kynosocial a worldwide, non-exclusive, royalty-free, sub-licensable and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content in connection with the Service and Kynosocial's business, including, but not limited to, for the purpose of promoting and redistributing part or all of the Service in any media formats and through any media channels.</p>
					
					<p>You also agree that Kynosocial may remove or refuse to make available any of your User Content for any or no reason.</p>
					
					<h3>A5. Third-Party Content</h3>
					
					<p>The Service may contain content from third-parties ("Third-Party Content"). Kynosocial does not control, endorse or adopt any Third-Party Content and makes no representation or warranties of any kind regarding the Third-Party Content, including, but not limited to, its accuracy, completeness, timeliness, or reliability. You acknowledge that you must evaluate, and bear all risks associated with, the use of any Third-Party Content, and you agree that Kynosocial is not responsible or liable for any Third-Party Content.</p>
					
					<h3>A6. Termination</h3>
					
					<p>Kynosocial reserves the right, in its sole discretion, to terminate your access to all or part of the Service at any time, with or without notice, for any reason or no reason.</p>
					
					<h3>A7. Disclaimer of Warranties</h3>
					
					<p>THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, KYNOSOCIAL EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
					
					<p>KYNOSOCIAL MAKES NO WARRANTY THAT: (i) THE SERVICE WILL MEET YOUR REQUIREMENTS; (ii) THE SERVICE WILL BE AVAILABLE ON AN UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE BASIS; (iii) THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE SERVICE WILL BE ACCURATE OR RELIABLE; OR (iv) THE QUALITY OF ANY PRODUCTS, SERVICES, INFORMATION, OR OTHER MATERIAL PURCHASED OR OBTAINED BY YOU THROUGH THE SERVICE WILL MEET YOUR EXPECTATIONS.</p>
					
					<p>ANY MATERIAL DOWNLOADED OR OTHERWISE OBTAINED THROUGH THE USE OF THE SERVICE IS DONE AT YOUR OWN DISCRETION AND RISK, AND YOU WILL BE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR COMPUTER SYSTEM OR LOSS OF DATA THAT RESULTS FROM THE DOWNLOAD OF ANY SUCH MATERIAL.</p>
					
					<h3>A8. Limitation of Liability</h3>
					
					<p>YOU EXPRESSLY UNDERSTAND AND AGREE THAT KYNOSOCIAL SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING, BUT NOT LIMITED TO, DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA OR OTHER INTANGIBLE LOSSES (EVEN IF KYNOSOCIAL HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES), RESULTING FROM: (i) THE USE OR THE INABILITY TO USE THE SERVICE; (ii) THE COST OF PROCUREMENT OF SUBSTITUTE GOODS AND SERVICES RESULTING FROM ANY GOODS, DATA, INFORMATION OR SERVICES PURCHASED OR OBTAINED OR MESSAGES RECEIVED OR TRANSACTIONS ENTERED INTO THROUGH OR FROM THE SERVICE; (iii) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS OR DATA; (iv) STATEMENTS OR CONDUCT OF ANY THIRD PARTY ON THE SERVICE; OR (v) ANY OTHER MATTER RELATING TO THE SERVICE.</p>
					
					<p>IN NO EVENT SHALL KYNOSOCIAL'S TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, AND CAUSES OF ACTION EXCEED THE AMOUNT PAID BY YOU, IF ANY, FOR ACCESSING OR USING THE SERVICE.</p>
					
					<p>IF YOU ARE DISSATISFIED WITH THE SERVICE OR WITH ANY OF KYNOSOCIAL'S TERMS, CONDITIONS, RULES, POLICIES, GUIDELINES, OR PRACTICES, YOUR SOLE AND EXCLUSIVE REMEDY IS TO DISCONTINUE USING THE SERVICE.</p>
					
					<h3>A9. Indemnity</h3>
					
					<p>You agree to indemnify and hold Kynosocial and its affiliates, officers, directors, agents, and employees harmless from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of: (i) your use of the Service; (ii) your violation of this Agreement; or (iii) your violation of any rights of another.</p>
					
					<h3>A10. Miscellaneous</h3>
					
					<p>This Agreement constitutes the entire agreement between you and Kynosocial with respect to the Service, and supersedes all prior or contemporaneous communications, whether electronic, oral or written, between you and Kynosocial with respect to the Service.</p>
					
					<p>If any provision of this Agreement is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall be enforced to the fullest extent under law.</p>
					
					<p>Kynosocial's failure to enforce any right or provision of this Agreement shall not constitute a waiver of such right or provision.</p>
					
					<p>This Agreement is governed by the laws of the State of Washington, without regard to its conflict of law provisions.</p>
					
					<p>This Agreement does not, and shall not be construed to, create any partnership, joint venture, employer-employee, agency or franchisor-franchisee relationship between you and Kynosocial.</p>
					
					<p>The Service is operated by Kynosocial from its offices in the United States. Kynosocial makes no representation that materials on the Service are appropriate or available for use in other locations. Those who choose to access the Service from other locations do so on their own initiative and are responsible for compliance with local laws, if and to the extent local laws are applicable.</p>
					
					<h3>A11. Contact Information</h3>
					
					<p>If you have any questions about this Agreement, please contact us at:</p>
					
					<p>support@kyno.social</p>
					</div>
				</div>
			</div>
					`;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load EULA", "list");
	}
}

function renderPrivacyPage() {
	try {
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Privacy Policy";
		document.getElementById("document-title").innerHTML =
			"kynosocial - privacy policy";
		document.getElementById("list").innerHTML = `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
					<h2>Kynosocial Privacy Policy</h2>
					<p>Kynosocial ("us", "we", or "our") operates the http://www.kyno.social website (the "Service").</p>

					<p>This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
					
					<p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined in this Privacy Policy, terms used in this Privacy Policy have the same meanings as in our End User Licence Agreement</p>
					
					<h3>A1. Information Collection And Use</h3>
					
					<p>We collect several different types of information for various purposes to provide and improve our Service to you. The types of data we collect include, but are not limited to:</p>
					
					<h4>1. Personal Data</h4>
					
					<p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
					
					<ul>
					<li>Email address</li>
					
					<li>First name and last name</li>
					
					<li>Cookies and Usage Data</li>
					</ul>
					
					<h4>2. Usage Data</h4>
					
					<p>We may also collect information how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
					
					<h4>3. Tracking & Cookie Data</h4>
					
					<p>We use cookies and similar tracking technologies ("Cookies") to track the activity on our Service and hold certain information.</p>
					
					<p>Cookies are files with a small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from a website and stored on your device. Tracking technologies also used are beacons, tags, and scripts to collect and track information and to improve and analyze our Service.</p>
					
					<p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>
					
					<p>Examples of Cookies we use:</p>
					
					<ul>
					<li>Session Cookies. We use Session Cookies to keep you signed into our Service between browser reloads and restarts.</li>
					
					<li>Preference Cookies. We use Preference Cookies to remember your preferences and various settings.</li>
					
					<li>Security Cookies. We use Security Cookies for security purposes.</li>
					</ul>
					<h3>A2. Use of Data</h3>
					
					<p>Kynosocial uses the collected data for various purposes:</p>
					
					<ul>
					<li>To provide and maintain our Service</li>
					<li>To notify you about changes to our Service</li>
					<li>To allow you to participate in interactive features of our Service when you choose to do so</li>
					<li>To provide customer support</li>
					<li>To gather analysis or valuable information so that we can improve our Service</li>
					<li>To detect, prevent and address technical issues</li>
					</ul>

					<h3>A3. Transfer Of Data</h3>
					<p>Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction; where the data protection laws may differ than those from your jurisdiction.</p>
					
					<p>If you are located outside of United States and choose to provide information to us, please note that we transfer the data, including Personal Data, to United States and process it there.</p>
					
					<p>Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.</p>
					
					<p>Kynosocial will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy and no transfer of your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of your data and other personal information.</p>
					
					<h3>A4. Disclosure Of Data</h3>
					
					<p>Kynosocial may disclose your Personal Data in the good faith belief that such action is necessary to:</p>
					
					<ul>
					<li>To comply with a legal obligation</li>
					<li>To protect and defend the rights or property of Kynosocial</li>
					<li>To prevent or investigate possible wrongdoing in connection with the Service</li>
					<li>To protect the personal safety of users of the Service or the public</li>
					<li>To protect against legal liability</li>
					</ul>

					<h3>A5. Security Of Data</h3>
					
					<p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
					
					<h3>A5. Links To Other Sites</h3>
					
					<p>Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p>
					
					<p>We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.</p>
					
					<h3>A6. Changes To This Privacy Policy</h3>
					
					<p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
					
					<p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
					
					<h3>A7. Contact Us</h3>
					
					<p>If you have any questions about this Privacy Policy, please contact us:</p>
					
					<p>By email: support@kyno.social</p>
					</div>
				</div>
			</div>
			`;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load Privacy Policy", "list");
	}
}

function renderAboutPage() {
	try {
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "About";
		document.getElementById("document-title").innerHTML = "kynosocial - about";
		document.getElementById("list").innerHTML = `
			<div class="post-item">
				<div class="post-content-wrapper">
					<div class="post-content">
					<img src="/img/aboutbanner.webp" alt="An abstract oil painting of a snowy mountain range" style="width: 100%; height: auto; margin: 0 auto; display: block;">
					<h2>Kynosocial: a social media company based around minimalism</h2>
					<p>Our mission is to help people connect on a deeper level by creating a space for quality interactions, free of the noise and distractions of traditional social media.</p>
					
					<p>Kynosocial is a new kind of social media platform that emphasizes quality over quantity. We believe that less is more, and that true connection comes from quality interactions, not from a constant stream of meaningless distractions.</p>
					
					<p>On Kynosocial, you'll find a variety of features that encourage deeper connection and meaningful conversation. From our simple, elegant interface to our focus on quality content, we've created a social media experience that is both refreshing and addictive.</p>
					
					<p>We hope you'll join us on this journey to discover the power of minimalism in social media, and in life.</p>
				</div>
			</div>
			`;
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load About page", "list");
	}
}

async function renderPage() {
	const params = new Proxy(new URLSearchParams(window.location.search), {
		get: (searchParams, prop) => searchParams.get(prop),
	});
	const page = params.page;
	try {
		renderNavbar();
		if (page == "signin") {
			renderSigninPage();
		} else if (page == "signup") {
			renderSignupPage();
		} else if (page == "signout") {
			renderSignoutPage();
		} else if (page == "trending") {
			renderNotices();
			renderTrendingPage(params.section);
		} else if (page == "categories") {
			renderNotices();
			renderCategoriesPage(params.section);
		} else if (page == "category") {
			renderNotices();
			renderCategoryPage(params.category, params.section);
		} else if (page == "error") {
			renderErrorPage();
		} else if (page == "post") {
			await Promise.all([
				renderNotices(),
				renderPostPage(),
				renderComments(false, params.post, params.commentsection),
			]).then(() => {
				tippy("[data-tippy-content]");
			});
		} else if (page == "user") {
			await Promise.all([
				renderNotices(),
				await renderUserPage(),
				renderManageProfile(params.user),
				renderComments(true, params.user, params.commentsection),
			]).then(() => {
				tippy("[data-tippy-content]");
			});
		} else if (page == "addpost") {
			renderNotices();
			renderAddPostPage();
		} else if (page == "verify") {
			sendVerificationEmail();
		} else if (page == "eula") {
			renderNotices();
			renderEULAPage();
		} else if (page == "privacy") {
			renderNotices();
			renderPrivacyPage();
		} else if (page == "about") {
			renderNotices();
			renderAboutPage();
		} else {
			renderNotices();
			renderHomePage(params.section);
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load literally anything", "list");
	}
}

// render page
await renderPage();
try {
	(adsbygoogle = window.adsbygoogle || []).push({});
} catch (error) {}

// console log warning to protect user account
console.log(
	"%c\r\n\r\n __        ___    ____  _   _ ___ _   _  ____ _ \r\n \\ \\      / / \\  |  _ \\| \\ | |_ _| \\ | |/ ___| |\r\n  \\ \\ /\\ / / _ \\ | |_) |  \\| || ||  \\| | |  _| |\r\n   \\ V  V / ___ \\|  _ <| |\\  || || |\\  | |_| |_|\r\n    \\_/\\_/_/   \\_\\_| \\_\\_| \\_|___|_| \\_|\\____(_)\r\n\r\n\rThis is the browser console.\nIf you do not know what you are doing,\nplease do not enter any commands here or paste any code.\nDoing so may compromise your account.\r\n\r\n",
	"color: red; "
);
