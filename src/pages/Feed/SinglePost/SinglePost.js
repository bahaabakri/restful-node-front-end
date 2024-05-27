import React, { Component } from "react";

import Image from "../../../components/Image/Image";
import "./SinglePost.css";

class SinglePost extends Component {
  state = {
    title: "",
    author: "",
    date: "",
    image: "",
    content: "",
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphqlGetPost = {
      query: `
        {
          post(postId: "${postId}") {
            title
            creator {
              name
            }
            imageUrl
            content
            createdAt
          }
        }
      `,
    };
    fetch(`http://localhost:8080/graphql`, {
      method: 'POST',
      body: JSON.stringify(graphqlGetPost),
      headers: {
        'Authorization': "Bearer " + localStorage.getItem('token'),
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          if (resData.errors[0].status === 401) {
            throw new Error('Could not authenticate you!');
          } else if (resData.errors[0].status === 404) {
            throw new Error('Page not Found!')
          } else {
            throw new Error('Fails to get this post')
          }
        }
        this.setState({
          title: resData.data.post.title,
          author: resData.data.post.creator.name,
          image: `http://localhost:8080/${resData.data.post.imageUrl}`,
          date: new Date(resData.data.post.createdAt).toLocaleDateString("en-US"),
          content: resData.data.post.content,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
