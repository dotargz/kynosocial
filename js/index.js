"use strict";
var DateTime = luxon.DateTime;

var md = window.markdownit();

import PocketBase from "./pocketbase.es.mjs";

let client;

try {
	client = new PocketBase("https://backend.kyno.social");
} catch (error) {
	console.log(error);
	renderErrorPage("Failed to load client", "list");
}

// auth
console.log(client.authStore.model);

// utility functions
async function truncateText(text, length) {
	if (text.length > length) {
		return text.substring(0, length) + "...";
	} else {
		return text;
	}
}

async function cleanText(text) {
	return text.replace(/(<([^>]+)>)/gi, "").trim();
}

async function getBadgeHTML(userObject) {
	let badgehtml = "";
	if (userObject.badges.length > 0) {
		for (let i = 0; i < userObject.badges.length; i++) {
			if (userObject.badges[i] == "dev") {
				badgehtml += `<i class="fa-solid fa-code" data-tippy-content="Developer"></i> `;
			} else if (userObject.badges[i] == "bot") {
				badgehtml += `<i class="fa-solid fa-robot" data-tippy-content="Bot"></i> `;
			} else if (userObject.badges[i] == "mod") {
				badgehtml += `<i class="fa-solid fa-cogs" data-tippy-content="Moderator"></i> `;
			} else if (userObject.badges[i] == "admin") {
				badgehtml += `<i class="fa-solid fa-user-cog" data-tippy-content="Administrator"></i> `;
			} else if (userObject.badges[i] == "beta") {
				badgehtml += `<i class="fa-solid fa-user-astronaut" data-tippy-content="Beta Tester"></i> `;
			} else if (userObject.badges[i] == "bughunter") {
				badgehtml += `<i class="fa-solid fa-bug-slash" data-tippy-content="Bug Hunter"></i> `;
			} else if (userObject.badges[i] == "bloom") {
				badgehtml += `<i class="fa-solid fa-seedling" data-tippy-content="Bloom Subscriber"></i> `;
			} else if (userObject.badges[i] == "verified") {
				badgehtml += `<i class="fa-solid fa-circle-check" data-tippy-content="Verified"></i> `;
			} else {
				badgehtml += `<i class="fa-solid fa-question" data-tippy-content="Secret Badge"></i> `;
			}
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
		console.log(resultList);
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
				24
			)}</a>
					</div>
					<div class="post-content">
						${await truncateText(await md.renderInline(await cleanText(content)), 56)}
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
		// only render up to 5 pages, the current page, and the 2 pages before and after it
		if (resultList.totalPages > 1) {
			const pagination = document.getElementById("pagination");
			pagination.innerHTML = "";
			const page = resultList.page;
			const pages = resultList.totalPages;
			const start = Math.max(1, page - 2);
			const end = Math.min(pages, page + 2);
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
				'<p>You are currently <b class="purple-text">NOT</b> signed into the website. Please sign in to post.<br><a href="?page=signup"><button class="btn-main">< Sign up ></button></a> <a href="?page=signin"><button class="btn-alt">< Sign in ></button></a></p>';
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load notices", "list-notice");
	}
}

async function renderNavbar() {
	try {
		// redirect id 'nav-profile-link' to signin page if not signed in
		if (
			client.authStore.isValid == false ||
			client.authStore.model == {} ||
			client.authStore.model == undefined ||
			client.authStore.model == null
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

async function renderUserPage(id) {
	try {
		const user = await client.records.getOne("profiles", id, {});
		let self;
		// get self if logged in
		client.users.refresh();
		if (client.authStore.isValid == true) {
			self = client.authStore.model.profile;
		}
		let userbio;
		if (user.bio == "") {
			userbio = "< No biography found >";
		} else {
			userbio = user.bio;
		}
		// compute badges
		const userBadgesIcons = await getBadgeHTML(user);
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
			followbutton = `<a href="#"><button id="follow-${user.id}-btn" class="btn btn-main followbtn-small">< Follow ></button></a>`;
			// add event listener to follow button
		}

		// if already following, change button to unfollow
		if (client.authStore.isValid == true) {
			if (self.following.includes(user.id)) {
				followbutton = `<a href="#"><button id="follow-${user.id}-btn" class="btn btn-main followbtn-small">< Unfollow ></button></a>`;
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

		console.log(self.following);

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
				<label for="email">E-Mail:</label>
				<input type="email" class="form-control" id="email" name="email" placeholder="E-Mail">
			</div>
			<div class="form-group">
				<label for="password">Password:</label>
				<input type="password" class="form-control" id="password" name="password" placeholder="Password">
			</div>
			<button type="submit" class="btn btn-main">\< Sign in \></button>
			<p style="font-size:0.8rem;margin-bottom:0;text-align:center;width:100%;">Don't have an account? <button type="button" class="btn btn-main" onclick="window.location.href='?page=signup'">< Sign up ></button></p>
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
		console.log(email, password);
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
			<button type="submit" class="btn btn-main">\< Sign up \></button>
			<p style="font-size:0.8rem;margin-bottom:0;text-align:center;width:100%;">Already have an account? <button type="button" class="btn btn-main" onclick="window.location.href='?page=signin'">< Sign in ></button></p>
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
		console.log(createdUser);
		await client.users.authViaEmail(email, password);
		await client.users.refresh();
		const updatedProfile = await client.records.update(
			"profiles",
			createdUser.profile.id,
			{
				name: username,
				badges: createdUser.profile.badges,
			}
		);
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
	if (errorCounter == null) {
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
		console.log(resultList);
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
                    <a href="?page=user&user=${postUser.id}">${postUserName}</a>
                </div>
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    <a href="/?page=post&post=${post.id}">${await truncateText(
					await cleanText(title),
					24
				)}</a>
                </div>
                <div class="post-content">
                    ${await truncateText(
											await md.renderInline(await cleanText(content)),
											56
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
				const start = Math.max(1, page - 2);
				const end = Math.min(pages, page + 2);
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
		console.log(resultList);
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
			const start = Math.max(1, page - 2);
			const end = Math.min(pages, page + 2);
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
		console.log(resultList);
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
					24
				)}</a>
                </div>
                <div class="post-content">
                    ${await truncateText(
											await md.renderInline(await cleanText(content)),
											56
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
				const start = Math.max(1, page - 2);
				const end = Math.min(pages, page + 2);
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
						<div class="form-group">
							<label for="title">Title</label>
							<input type="text" class="form-control" id="posttitle" name="title" placeholder="Title">
						</div>
						<div class="form-group">
							<label for="content">Content</label>
							<textarea style="resize:none;height:5rem;" class="form-control" id="postcontent" name="content" rows="3" placeholder="Remember, be nice!"></textarea>
						</div>
						<div class="form-group">
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
						<button type="submit" class="btn btn-main">< Add Post ></button>
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
		const form = event.target;
		const title = form.posttitle.value;
		const content = form.postcontent.value;
		const categoryId = form.postcategory.value;
		const category = await client.records.getOne("categories", categoryId);
		const user = await client.records.getOne(
			"profiles",
			client.authStore.model.profile.id
		);

		// verify the form
		if (title == "") {
			renderErrorMessage("Please fill in all fields", "postcontent");
			return;
		}
		if (content == "") {
			renderErrorMessage("Please fill in all fields", "postcontent");
			return;
		}
		if (category == null) {
			renderErrorMessage("Please select a category", "postcategory");
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

async function renderErrorPage(err, div) {
	if (err == null) {
		err = "An unknown error has occurred";
	}
	if (div == null) {
		div = "list";
	}
	document.getElementById(div).style.display = "flex";
	document.getElementById(`${div}-fieldset`).style.display = "flex";
	//document.getElementById(`${div}-legend`).innerHTML = "Error";
	document.getElementById(
		div
	).innerHTML = `<img alt="Funny GIF of man smashing computer" src="img/error.gif" width="100%"><p><i class="fa-solid fa-bug"></i> An error has occurred.</p><span class="post-created">(${err})</span>`;
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
						<button type="submit" class="btn btn-main">\< Comment \></button>
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
				const start = Math.max(1, page - 2);
				const end = Math.min(pages, page + 2);
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
		console.log(comment);
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
		const themes = ["modern", "retro"];
		let html = "";
		for (let i = 0; i < themes.length; i++) {
			const theme = themes[i];
			html += `<option value="${theme}" ${
				localStorage.getItem("theme") == theme ? "selected" : ""
			}>${theme}</option>`;
		}
		console.log(html);
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
									<input type="submit" class="upload-i" id="avatarupload" value="< Save Avatar >" class="btn btn-main">
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
									<input type="submit" class="upload-i" value="< Save Bio >" class="btn btn-main">
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
									<input type="submit" class="upload-i" value="< Save Theme >" class="btn btn-main">
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
		button.value = "< Uploading... >";
		const form = e.target;
		const avatar = form.avatar.files[0];
		if (avatar == undefined) {
			window.location.href =
				"/?page=user&user=" + client.authStore.model.profile.id;
		}
		console.log(client.authStore.model.profile.badges);
		await client.users.refresh();
		const formData = new FormData();
		formData.append("avatar", avatar);
		const result = await client.records.update(
			"profiles",
			client.authStore.model.profile.id,
			formData
		);
		console.log(result);
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
			console.log("no bio");
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
			console.log("no theme");
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
				await renderUserPage(params.user),
				renderManageProfile(params.user),
				renderComments(true, params.user, params.commentsection),
			]).then(() => {
				tippy("[data-tippy-content]");
			});
		} else if (page == "addpost") {
			renderNotices();
			renderAddPostPage();
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

// console log warning to protect user account
console.log(
	"%c\r\n\r\n __        ___    ____  _   _ ___ _   _  ____ _ \r\n \\ \\      / / \\  |  _ \\| \\ | |_ _| \\ | |/ ___| |\r\n  \\ \\ /\\ / / _ \\ | |_) |  \\| || ||  \\| | |  _| |\r\n   \\ V  V / ___ \\|  _ <| |\\  || || |\\  | |_| |_|\r\n    \\_/\\_/_/   \\_\\_| \\_\\_| \\_|___|_| \\_|\\____(_)\r\n\r\n\rThis is the browser console.\nIf you do not know what you are doing,\nplease do not enter any commands here or paste any code.\nDoing so may compromise your account.\r\n\r\n",
	"color: red; font-size: 2.5vmin;"
);
