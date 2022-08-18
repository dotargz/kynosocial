"use strict";
var DateTime = luxon.DateTime;

import PocketBase from "./pocketbase.es.mjs";

let client;

try {
	client = new PocketBase("https://api.kynosocial.onespark.dev");
} catch (error) {
	console.log(error);
	renderErrorPage("Failed to load client", "list");
}

// auth
console.log(client.authStore.model);

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

async function removeItemOnce(arr, value) {
	var index = arr.indexOf(value);
	if (index > -1) {
	  arr.splice(index, 1);
	}
	return arr;
  }

async function renderHomePage() {
	try {
		// fetch a paginated records list
		const resultList = await client.records.getList("posts", 1, 15, {
			filter: 'created >= "2022-01-01 00:00:00"',
			sort: "-created,id",
			expand: "author,category",
		});
		console.log(resultList);
		const posts = resultList.items;

		// put all results into an html list

		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Home";
		document.getElementById("document-title").innerHTML = "Kynosocial - Home";
		for (let i = 0; i < posts.length; i++) {
			const post = posts[i];
			const postUser = post["@expand"].author;
			const postCategory = post["@expand"].category;
			const postUserName = postUser.name;
			const title = post.title;
			const content = post.content;
			const created = post.created;
			const updated = post.updated;
			const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img src="https://api.kynosocial.onespark.dev/api/files/systemprofiles0/${
													postUser.id
												}/${postUser.avatar}" width="64px" onerror="this.src='../img/noimg.svg'">
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
                    ${await truncateText(content, 56)}
                </div>
                <div class="post-created">
                    ${created} · <a href="?page=category&category=${postCategory.id}">#${postCategory.name}</a>
                </div>
            </div>
        </div>`;
			document.getElementById("list").innerHTML += html;
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
			document.getElementById("list-notice-fieldset").style.display = "block";
			document.getElementById("list-notice").innerHTML =
				'<p>You are currently <b class="purple-text">NOT</b> signed into the website. Please sign in to post.<br style="margin-bottom:0.5rem;"><a href="?page=signup"><button class="btn-main">< Sign up ></button></a> <a href="?page=signin"><button class="btn-alt">< Sign in ></button></a></p>';
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
			document.getElementById("nav-profile").innerHTML = '<i class="fa-solid fa-user-plus"></i>';
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

async function unRenderNotices() {
	try {
		document.getElementById("list-notice").style.display = "none";
		document.getElementById("list-notice").innerHTML = "Could not load notices";
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to unload notices", "list-notice");
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
		await client.records.update("posts", postId, data);

		// put all results into an html list

		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Post";
		const post = record;
		const postUser = post["@expand"].author;
		const postCategory = post["@expand"].category;
		const postUserName = postUser.name;
		const title = post.title;
		document.getElementById("document-title").innerHTML =
			'Kynosocial - "' + title + '"';
		const content = post.content;
		const created = post.created;
		const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img src="https://api.kynosocial.onespark.dev/api/files/systemprofiles0/${
													postUser.id
												}/${postUser.avatar}" width="64px" onerror="this.src='../img/noimg.svg'">
                    </a>
                </div>
                <div class="post-username">
                    <a href="?page=user&user=${postUser.id}">${postUserName}</a>
                </div>
				<div class="post-views">
					<i class="fa-solid fa-eye views-icon"></i>${numeral(post.views).format("0a")}
				</div>
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    ${title}
                </div>
                <div class="post-content">
                    ${content}
                </div>
                <div class="post-created">
                    ${created} · <a href="?page=category&category=${postCategory.id}">#${postCategory.name}</a>
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
		const id = params.user;
		const user = await client.records.getOne("profiles", id, {});

		let self;
		// get self if logged in
		if (client.authStore.isValid == true) {
			self = await client.records.getOne("profiles", client.authStore.model.profile.id, {});
		}
		let userbio;
		if (user.bio == "") {
			userbio = "< No biography found >";
		} else {
			userbio = user.bio;
		}
		// compute badges
		let badgehtml = "";
		if (user.badges.length > 0) {
			for (let i = 0; i < user.badges.length; i++) {
				if (user.badges[i] == "dev") {
					badgehtml += `<i class="fa-solid fa-code"></i> `;
				} else if (user.badges[i] == "bot") {
					badgehtml += `<i class="fa-solid fa-robot"></i> `;
				} else if (user.badges[i] == "mod") {
					badgehtml += `<i class="fa-solid fa-cogs"></i> `;
				} else if (user.badges[i] == "admin") {
					badgehtml += `<i class="fa-solid fa-user-cog"></i> `;
				} else if (user.badges[i] == "beta") {
					badgehtml += `<i class="fa-solid fa-user-astronaut"></i> `;
				} else if (user.badges[i] == "bloom") {
					badgehtml += `<i class="fa-solid fa-seedling"></i> `;
				} else if (user.badges[i] == "verified") {
					badgehtml += `<i class="fa-solid fa-circle-check"></i> `;
				}
			}
		}
		const userBadgesIcons = badgehtml;
		// put all results into an html list
		document.getElementById("document-title").innerHTML =
			"Kynosocial - " + user.name + "'s profile";
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "User";

		let followbutton = "";
		
		if (client.authStore.isValid == false || user.id == client.authStore.model.profile.id) {
			followbutton = ``;
		} else {
			followbutton = `<a href="#"><button id="follow-${user.id}-btn" class="btn btn-main" style="font-size:0.5rem;width:64px;">< Follow ></button></a>`;
				// add event listener to follow button
		}

		// if already following, change button to unfollow
		if (client.authStore.isValid == true) {
		if (self.following.includes(user.id)) {
			followbutton = `<a href="#"><button id="follow-${user.id}-btn" class="btn btn-main" style="font-size:0.48rem;width:64px;">< Unfollow ></button></a>`;
		}
		}

		const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                        <img src="https://api.kynosocial.onespark.dev/api/files/systemprofiles0/${user.id}/${user.avatar}" width="64px" onerror="this.src='../img/noimg.svg'">
                </div>
				<div class="post-username">
					${followbutton}
				</div>
                
            </div>
            <div class="post-content-wrapper">
                <div class="post-title">
                    ${user.name} ${userBadgesIcons}
                </div>
                <div class="post-content">
                    ${userbio}
                </div>
                <div class="post-created">
                    Created: ${user.created}
                </div>
            </div>
        </div>`;
		document.getElementById("list").innerHTML += html;

		if (client.authStore.isValid == true) {
			if (user.id != client.authStore.model.profile.id) {
				document.getElementById(`follow-${user.id}-btn`).addEventListener("click", followUserManager);
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
		const self = await client.records.getOne("profiles", client.authStore.model.profile.id, {
			expand: "following",
		});

		console.log(self.following);

		if (self.following.includes(userID) == false) {
			const follow = {
				following: await self.following.concat(user.id),
				badges: self.badges,
			};
			await client.records.update("profiles", client.authStore.model.profile.id, follow);
			window.location.href = "?page=user&user=" + user.id;
		} else if (self.following.includes(userID) == true) {
			// calculate new following array
			const newFollowing = await removeItemOnce(self.following, userID);
			const follow = {
				following: newFollowing,
				badges: self.badges,
			};
			await client.records.update("profiles", client.authStore.model.profile.id, follow);
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
		throw new Error("Not implemented");
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load signup page", "list");
	}
}

async function renderSignoutPage() {
	client.authStore.clear();
	window.location.href = "/";
}

async function renderTrendingPage() {
	try {
		// only show posts from the last week
		const resultList = await client.records.getList("posts", 1, 15, {
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
			"Kynosocial - Trending";
		if (resultList.totalItems > 0) {
			for (let i = 0; i < posts.length; i++) {
				const post = posts[i];
				const postUser = post["@expand"].author;
				const postCategory = post["@expand"].category;
				const postUserName = postUser.name;
				const title = post.title;
				const content = post.content;
				const created = post.created;
				const updated = post.updated;
				const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img src="https://api.kynosocial.onespark.dev/api/files/systemprofiles0/${
													postUser.id
												}/${postUser.avatar}" width="64px" onerror="this.src='../img/noimg.svg'">
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
                    ${await truncateText(await cleanText(content), 56)}
                </div>
                <div class="post-created">
                    ${created} · <a href="?page=category&category=${postCategory.id}">#${postCategory.name}</a>
                </div>
            </div>
        </div>`;
				document.getElementById("list").innerHTML += html;
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

async function renderCategoriesPage() {
	try {
		const resultList = await client.records.getList("categories", 1, 15, {
			sort: "name",
		});
		console.log(resultList);
		const categories = resultList.items;

		// put all results into an html list
		document.getElementById("list").innerHTML = "";
		document.getElementById("list-legend").innerHTML = "Categories";
		document.getElementById("document-title").innerHTML =
			"Kynosocial - Categories";
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
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load categories page", "list");
	}
}

async function renderCategoryPage(categoryId) {
	try {
		const category = await client.records.getOne("categories", categoryId);
		const resultList = await client.records.getList("posts", 1, 15, {
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
			"Kynosocial - #" + category.name;

		if (resultList.totalItems > 0) {
			for (let i = 0; i < posts.length; i++) {
				const post = posts[i];
				const postUser = post["@expand"].author;
				const postUserName = postUser.name;
				const title = post.title;
				const content = post.content;
				const created = post.created;
				const html = `
        <div class="post-item">
            <div class="post-image-wrapper">
                <div class="post-image">
                    <a href="?page=user&user=${postUser.id}">
                        <img src="https://api.kynosocial.onespark.dev/api/files/systemprofiles0/${
													postUser.id
												}/${postUser.avatar}" width="64px" onerror="this.src='../img/noimg.svg'">
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
                    ${await truncateText(content, 56)}
                </div>
                <div class="post-created">
                    ${created}
                </div>
            </div>
        </div>`;
				document.getElementById("list").innerHTML += html;
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
		throw new Error("Not implemented");
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load post page", "list");
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
	document.getElementById(`${div}-fieldset`).style.display = "block";
	//document.getElementById(`${div}-legend`).innerHTML = "Error";
	document.getElementById(
		div
	).innerHTML = `<img src="img/error.gif" width="85%"><p><i class="fa-solid fa-bug"></i> An error has occurred.</p><span class="post-created">(${err})</span>`;
}

async function renderComments(isUserPageComment = false, ID = null) {
	try {
		let resultList;
		if (isUserPageComment == false) {
			resultList = await client.records.getList("post_comments", 1, 15, {
				filter:
					'created >= "2022-01-01 00:00:00" && linked_post.id = "' + ID + '"',
				sort: "-created,id",
				expand: "author",
			});
		} else {
			resultList = await client.records.getList("user_comments", 1, 15, {
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
							<textarea style="resize:none;width:24rem;" class="form-control" id="comment" name="comment" placeholder="Add a comment..." ></textarea>
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
				let badgehtml = "";
				if (author.badges.length > 0) {
					for (let i = 0; i < author.badges.length; i++) {
						if (author.badges[i] == "dev") {
							badgehtml += `<i class="fa-solid fa-code"></i> `;
						} else if (author.badges[i] == "mod") {
							badgehtml += `<i class="fa-solid fa-cogs"></i> `;
						} else if (author.badges[i] == "admin") {
							badgehtml += `<i class="fa-solid fa-user-cog"></i> `;
						} else if (author.badges[i] == "beta") {
							badgehtml += `<i class="fa-solid fa-user-astronaut"></i> `;
						} else if (author.badges[i] == "bot") {
							badgehtml += `<i class="fa-solid fa-robot"></i> `;
						}
					}
				}
				const userBadgesIcons = badgehtml;
				const html = `
				<div class="post-item">
					<div class="post-image-wrapper">
						<div class="post-image">
							<a href="?page=user&user=${author.id}">
								<img src="https://api.kynosocial.onespark.dev/api/files/systemprofiles0/${
									author.id
								}/${author.avatar}" width="64px" onerror="this.src='../img/noimg.svg'">
							</a>
						</div>
						
					</div>
					<div class="post-content-wrapper">
						<div class="post-title">
							<a href="/?page=user&user=${author.id}">${author.name} ${userBadgesIcons}</a>
						</div>
						<div class="post-content">
							${await truncateText(await cleanText(comment.content), 56)}
						</div>
						<div class="post-created">
							${comment.created}
						</div>
					</div>
				</div>`;
				document.getElementById("comments").innerHTML += html;
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
			await client.records.create('user_comments', {
				content: await cleanText(comment),
				author: client.authStore.model.profile.id,
				linked_profile: linkedID,
			});
			form.reset();
			window.location.href = "?page=user&user=" + linkedID;
			return false;
		} else {
			await client.records.create('post_comments', {
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

async function renderManageProfile(userID) {
	try {
		if (
			client.authStore.isValid == true &&
			client.authStore.model.profile.id == userID
		) {
			const result = await client.records.getOne(
				"profiles",
				client.authStore.model.profile.id
			);
			const user = result.item;
			document.getElementById("settings").style.display = "flex";
			document.getElementById("settings-fieldset").style.display = "block";
			document.getElementById("settings").innerHTML = "";
			document.getElementById("settings-legend").innerHTML = "Settings";
			const html = `
					<div class="post-item">
						<div class="post-content-wrapper">
							<div class="post-content">
							<a href="?page=signout"><i class="fa-solid fa-right-from-bracket"></i> Sign out</a>
							</div>	
						</div>	
					</div>
				`;
			document.getElementById("settings").innerHTML += html;
		}
	} catch (error) {
		console.log(error);
		renderErrorPage("Failed to load manage profile", "settings");
	}
}

async function renderPage() {
	const params = new Proxy(new URLSearchParams(window.location.search), {
		get: (searchParams, prop) => searchParams.get(prop),
	});
	const page = params.page;
	try {
		if (page == "signin") {
			await renderSigninPage();
		} else if (page == "signup") {
			await renderSignupPage();
		} else if (page == "signout") {
			await renderSignoutPage();
		} else if (page == "trending") {
			await renderTrendingPage();
			await renderNotices();
		} else if (page == "categories") {
			await renderCategoriesPage();
			await renderNotices();
		} else if (page == "category") {
			await renderCategoryPage(params.category);
			await renderNotices();
		} else if (page == "error") {
			await renderErrorPage();
		} else if (page == "post") {
			await renderPostPage();
			await renderNotices();
			await renderComments(false, params.post);
		} else if (page == "user") {
			await renderUserPage();
			await renderNotices();
			await renderComments(true, params.user);
			await renderManageProfile(params.user);
		} else if (page == "addpost") {
			await renderAddPostPage();
		} else {
			await renderHomePage();
			await renderNotices();
		}
		renderNavbar();
	} catch (error) {
		console.log(error);
		renderErrorPage();
	}
}

// render page
renderPage();
